require('dotenv').config();
process.env.SERVICE_NAME = 'turnos-worker';

const { connectDb } = require('./db');
require('./models');
const { Turno, EventoProcesado } = require('./models');
const { crearCanal, QUEUE, publishRetry, publishDlq } = require('./lib/rabbit');
const { retryConfig } = require('./lib/config');
const { runWithContext } = require('./lib/context');
const logger = require('./lib/logger');
const { recordatoriosProcesadosTotal } = require('./lib/metrics');

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

  let eventoParsed = null;
  try {
    eventoParsed = JSON.parse(message.content.toString());
  } catch (err) {
  }

  const correlationId = message.properties.headers?.['x-correlation-id'] ||
                        eventoParsed?.correlationId ||
                        null;

  await runWithContext({ correlationId }, async () => {
    try {
      if (count < config.simulatedFailures) {
        throw new TransientMessageError(`Falla transitoria simulada ${count + 1}/${config.simulatedFailures}`);
      }

      if (!eventoParsed || !validarEvento(eventoParsed)) {
        throw new PermanentMessageError('Evento inválido');
      }

      const evento = eventoParsed;

      const yaProcesado = await EventoProcesado.findOne({ where: { eventId: evento.eventId } });
      if (yaProcesado) {
        logger.info(`Duplicado reconocido: evento ${evento.eventId}`, {
          service: 'turnos-worker',
          eventId: evento.eventId,
          status: 'duplicate'
        });
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
          logger.info(`Duplicado reconocido (race): evento ${evento.eventId}`, {
            service: 'turnos-worker',
            eventId: evento.eventId,
            status: 'duplicate_race'
          });
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

      recordatoriosProcesadosTotal.inc({ status: 'success' });
      logger.info(`Notificacion procesada para turno ${turno.id}; evento ${evento.eventId}`, {
        service: 'turnos-worker',
        turnoId: turno.id,
        eventId: evento.eventId,
        status: 'success'
      });
      activeChannel.ack(message);
    } catch (error) {
      if (!(error instanceof PermanentMessageError) && count < config.maxRetries) {
        recordatoriosProcesadosTotal.inc({ status: 'retry' });
        logger.warn(`Reintento ${count + 1}/${config.maxRetries}: ${error.message}`, {
          service: 'turnos-worker',
          retryCount: count + 1,
          error: error.message
        });
        await publishRetry(activeChannel, message, count + 1, error.message);
        activeChannel.ack(message);
        return;
      }

      recordatoriosProcesadosTotal.inc({ status: 'dlq' });
      const reason = error instanceof PermanentMessageError
        ? `permanente: ${error.message}`
        : `reintentos agotados (${count}/${config.maxRetries}): ${error.message}`;

      logger.error(`Enviando a DLQ — ${reason}`, {
        service: 'turnos-worker',
        reason,
        retryCount: count
      });
      await publishDlq(activeChannel, message, reason, count);
      activeChannel.ack(message);
    }
  });
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

  logger.info('Worker escuchando cola ' + QUEUE, { service: 'turnos-worker', queue: QUEUE });
}

main().catch((error) => {
  logger.error('No se pudo iniciar el worker: ' + error.message, { service: 'turnos-worker' });
  process.exit(1);
});
