require('dotenv').config();
const http = require('http');
const express = require('express');
const swaggerUi = require('swagger-ui-express');
const { connectDb } = require('./db');
const routes = require('./routes');
const errorHandler = require('./middlewares/errorHandler');
const { NotFoundError } = require('./errors/AppError');
const { validateAccessToken } = require('./middlewares/auth');
const openapiSpec = require('../docs/openapi.json');
const { initWebSocket } = require('./lib/websocket');
const observabilityMiddleware = require('./middlewares/observability');
const { register, getMetricsSummary } = require('./lib/metrics');
const { getDashboardHtml } = require('./lib/dashboardHtml');

const app = express();
const server = http.createServer(app);
const port = process.env.PORT || 3000;

initWebSocket(server);

app.use(express.json());
app.use(observabilityMiddleware);

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

app.get('/dashboard', (req, res) => {
  res.type('html').send(getDashboardHtml());
});

app.get('/api/v1/metrics-summary', async (req, res) => {
  const summary = await getMetricsSummary();
  const { Turno } = require('./models');
  summary.recordatoriosProcesados = await Turno.count({ where: { recordatorioEnviado: true } });
  res.json(summary);
});

app.get('/api-docs/openapi.json', (req, res) => {
  res.json(openapiSpec);
});

app.get('/docs/openapi.json', (req, res) => {
  res.json(openapiSpec);
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openapiSpec));
app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapiSpec));

app.get('/', (req, res) => {
  res.json({
    mensaje: 'API de Reserva de Turnos de Salud (IAEW 2026)',
    version: '1.0.0',
    documentacion: '/docs',
    endpoints: '/api/v1',
    websocket: '/ws/agenda',
    metricas: '/metrics',
    dashboard: '/dashboard'
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'iaew-turnos-api',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

app.get('/token-info', validateAccessToken, (req, res) => {
  res.json({
    issuer: req.auth.payload.iss,
    audience: req.auth.payload.aud,
    subject: req.auth.payload.sub,
    scopes: req.auth.payload.scope
  });
});

app.use('/api/v1', routes);

app.use((req, res, next) => {
  next(new NotFoundError(`La ruta '${req.method} ${req.originalUrl}' no existe en este servidor`, 'RUTA_NO_ENCONTRADA'));
});

app.use(errorHandler);

if (require.main === module) {
  require('./models');

  connectDb()
    .then(() => {
      server.listen(port, () => {
        console.log(`API de Turnos escuchando en http://localhost:${port}`);
        console.log(`Documentación interactiva disponible en http://localhost:${port}/docs`);
        console.log(`WebSocket de Agenda en tiempo real en ws://localhost:${port}/ws/agenda`);
        console.log(`Métricas Prometheus en http://localhost:${port}/metrics`);
        console.log(`Dashboard de Observabilidad en http://localhost:${port}/dashboard`);
      });
    })
    .catch((error) => {
      console.error('Error conectando a PostgreSQL:', error.message);
      process.exit(1);
    });
}

app.server = server;
module.exports = app;
module.exports.server = server;
