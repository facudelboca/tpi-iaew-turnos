const crypto = require('crypto');
const { runWithContext } = require('../lib/context');
const logger = require('../lib/logger');
const { recordHttpRequest } = require('../lib/metrics');

const EXCLUDED_PATHS = new Set(['/metrics', '/dashboard', '/api/v1/metrics-summary']);

function observabilityMiddleware(req, res, next) {
  const incomingId = req.headers['x-correlation-id'] || req.headers['x-request-id'];
  const correlationId = incomingId ? String(incomingId) : crypto.randomUUID();

  req.correlationId = correlationId;
  res.setHeader('X-Correlation-ID', correlationId);

  if (EXCLUDED_PATHS.has(req.path)) {
    return next();
  }

  const startNs = process.hrtime.bigint();

  runWithContext({ correlationId }, () => {
    res.on('finish', () => {
      const endNs = process.hrtime.bigint();
      const durationSeconds = Number(endNs - startNs) / 1e9;
      const durationMs = Math.round(durationSeconds * 1000 * 100) / 100;

      const matchedRoute = req.route ? (req.baseUrl || '') + req.route.path : 'unmatched';
      recordHttpRequest(req.method, matchedRoute, res.statusCode, durationSeconds);

      const logFn = res.statusCode >= 500 ? logger.error : logger.info;

      logFn(`${req.method} ${req.originalUrl} ${res.statusCode}`, {
        http: {
          method: req.method,
          url: req.originalUrl,
          statusCode: res.statusCode,
          durationMs
        }
      });
    });

    next();
  });
}

module.exports = observabilityMiddleware;
