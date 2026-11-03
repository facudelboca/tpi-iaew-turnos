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

const app = express();
const server = http.createServer(app);
const port = process.env.PORT || 3000;

initWebSocket(server);

app.use(express.json());

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
    websocket: '/ws/agenda'
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
