const amqp = require('amqplib');
const { retryConfig } = require('./config');

const { retryDelayMs } = retryConfig();

const EXCHANGE = 'turnos.exchange';
const ROUTING_KEY = 'turno.reservado';
const QUEUE = 'notificaciones.turno-reservado';

const RETRY_EXCHANGE = 'turnos.retry.exchange';
const RETRY_QUEUE = 'notificaciones.turno-reservado.retry';
const DLX = 'turnos.dlx';
const DLQ_ROUTING_KEY = 'turno.reservado.dlq';
const DLQ = 'notificaciones.turno-reservado.dlq';

async function crearCanal() {
  const connection = await amqp.connect(process.env.RABBIT_URL);
  const channel = await connection.createConfirmChannel();

  await channel.assertExchange(EXCHANGE, 'direct', { durable: true });
  await channel.assertQueue(QUEUE, { durable: true });
  await channel.bindQueue(QUEUE, EXCHANGE, ROUTING_KEY);

  await channel.assertExchange(RETRY_EXCHANGE, 'direct', { durable: true });
  await channel.assertExchange(DLX, 'direct', { durable: true });

  await channel.assertQueue(RETRY_QUEUE, {
    durable: true,
    arguments: {
      'x-message-ttl': retryDelayMs,
      'x-dead-letter-exchange': EXCHANGE,
      'x-dead-letter-routing-key': ROUTING_KEY
    }
  });
  await channel.bindQueue(RETRY_QUEUE, RETRY_EXCHANGE, ROUTING_KEY);

  await channel.assertQueue(DLQ, { durable: true });
  await channel.bindQueue(DLQ, DLX, DLQ_ROUTING_KEY);

  return { connection, channel };
}

async function confirmedPublish(ch, exchange, routingKey, content, options) {
  const accepted = ch.publish(exchange, routingKey, content, options);
  if (!accepted) throw new Error('RabbitMQ aplicó back-pressure al publicar');
  await ch.waitForConfirms();
}

async function publicarTurnoReservado(evento) {
  const { connection, channel } = await crearCanal();

  try {
    await confirmedPublish(
      channel,
      EXCHANGE,
      ROUTING_KEY,
      Buffer.from(JSON.stringify(evento)),
      { contentType: 'application/json', persistent: true }
    );
  } finally {
    await channel.close();
    await connection.close();
  }
}

async function publishRetry(ch, message, retryCount, reason) {
  await confirmedPublish(ch, RETRY_EXCHANGE, ROUTING_KEY, message.content, {
    ...message.properties,
    persistent: true,
    headers: {
      ...(message.properties.headers || {}),
      'x-retry-count': retryCount,
      'x-last-error': reason
    }
  });
}

async function publishDlq(ch, message, reason, retryCount) {
  await confirmedPublish(ch, DLX, DLQ_ROUTING_KEY, message.content, {
    ...message.properties,
    persistent: true,
    headers: {
      ...(message.properties.headers || {}),
      'x-retry-count': retryCount,
      'x-dlq-reason': reason
    }
  });
}

module.exports = {
  EXCHANGE,
  QUEUE,
  ROUTING_KEY,
  RETRY_EXCHANGE,
  RETRY_QUEUE,
  DLX,
  DLQ,
  DLQ_ROUTING_KEY,
  crearCanal,
  confirmedPublish,
  publicarTurnoReservado,
  publishRetry,
  publishDlq
};
