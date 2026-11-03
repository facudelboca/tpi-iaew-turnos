const { getCorrelationId } = require('./context');

const SERVICE_NAME = process.env.SERVICE_NAME || 'turnos-api';

function emit(level, message, meta = {}) {
  const correlationId = meta.correlationId || getCorrelationId() || null;
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    service: meta.service || SERVICE_NAME,
    message,
    ...(correlationId ? { correlationId } : {}),
    ...meta
  };

  const serialized = JSON.stringify(logEntry);
  if (level === 'error') {
    process.stderr.write(serialized + '\n');
  } else {
    process.stdout.write(serialized + '\n');
  }
}

const logger = {
  info: (message, meta) => emit('info', message, meta),
  warn: (message, meta) => emit('warn', message, meta),
  error: (message, meta) => emit('error', message, meta),
  debug: (message, meta) => emit('debug', message, meta)
};

module.exports = logger;

