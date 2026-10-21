require('dotenv').config();

const { connectDb } = require('./db');
require('./models');
const { Turno, EventoProcesado } = require('./models');
const { crearCanal, QUEUE, publishRetry, publishDlq } = require('./lib/rabbit');
const { retryConfig } = require('./lib/config');

class PermanentMessageError extends Error {}
class TransientMessageError extends Error {}

function retryCountOf(message) {
  const value = Number(message.properties.headers?.['x-retry-count'] ?? 0);
  return Number.isInteger(value) && value >= 0 ? value : 0;
}

function validarEvento(evento) {
  if (evento.type !== 'turno.reservado') return false;
  if (evento.version !== 1) return false;
  if (!evento.eventId || !evento.occurredAt) return false;
  if (!evento.data || !evento.data.turnoId) return false;
  return !Number.isNaN(Date.parse(evento.occurredAt));
}

async function procesarMensaje(message, activeChannel) {
  const count = retryCountOf(message);
  const config = retryConfig();

  try {
    if (count < config.simulatedFailures) {
      throw new TransientMessageError(`Falla transitoria simulada ${count + 1}/${config.simulatedFailures}`);
    }

    const evento = JSON.parse(message.content.toString());

    if (!validarEvento(evento)) {
      throw new PermanentMessageError('Evento inválido');
    }

    const yaProcesado = await EventoProcesado.findOne({ where: { eventId: evento.eventId } });
    if (yaProcesado) {
      console.log(`Duplicado reconocido: evento ${evento.eventId}`);
      activeChannel.ack(message);
      return;
    }

    const turno = await Turno.findByPk(evento.data.turnoId);
    if (!turno) {
      throw new PermanentMessageError(`Turno inexistente: ${evento.data.turnoId}`);
    }

    let eventoReg;
    try {
      eventoReg = await EventoProcesado.create({
        eventId: evento.eventId,
        type: evento.type,
        turnoId: turno.id
      });
    } catch (error) {
      if (error?.name === 'SequelizeUniqueConstraintError') {
        console.log(`Duplicado reconocido (race): evento ${evento.eventId}`);
        activeChannel.ack(message);
        return;
      }
      throw error;
    }

    try {
      turno.recordatorioEnviado = true;
      turno.fechaRecordatorio = new Date();
      await turno.save();
    } catch (error) {
      if (eventoReg) {
        await eventoReg.destroy();
      }
      throw new TransientMessageError(`Base de datos no pudo persistir el efecto: ${error.message}`);
    }

    console.log(`Notificación procesada para turno ${turno.id}; evento ${evento.eventId}`);
    activeChannel.ack(message);
  } catch (error) {
    if (!(error instanceof PermanentMessageError) && count < config.maxRetries) {
      console.warn(`Reintento ${count + 1}/${config.maxRetries}: ${error.message}`);
      await publishRetry(activeChannel, message, count + 1, error.message);
      activeChannel.ack(message);
      return;
    }

    const reason = error instanceof PermanentMessageError
      ? `permanente: ${error.message}`
      : `reintentos agotados (${count}/${config.maxRetries}): ${error.message}`;

    console.error(`Enviando a DLQ — ${reason}`);
    await publishDlq(activeChannel, message, reason, count);
    activeChannel.ack(message);
  }
}

async function main() {
  await connectDb();
  const { channel } = await crearCanal();

  await channel.consume(
    QUEUE,
    (message) => {
      if (message) procesarMensaje(message, channel);
    },
    { noAck: false }
  );

  console.log('Worker escuchando cola ' + QUEUE);
}

main().catch((error) => {
  console.error('No se pudo iniciar el worker:', error.message);
  process.exit(1);
});
