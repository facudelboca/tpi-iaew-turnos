require('dotenv').config();
const express = require('express');
const { connectDb } = require('./db');
const routes = require('./routes');
const errorHandler = require('./middlewares/errorHandler');
const { NotFoundError } = require('./errors/AppError');

const app = express();
const port = process.env.PORT || 3000;
const swaggerUi = require("swagger-ui-express");
const openapiSpec = require("../docs/openapi.json");
app.use(express.json());
// Documentación interactiva Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openapiSpec));

// Endpoint base / información del servicio
app.get('/', (req, res) => {
  res.json({
    mensaje: 'API de Reserva de Turnos de Salud (IAEW 2026)',
    version: '1.0.0',
    documentacion: '/api-docs',
    endpoints: '/api/v1'
  });
});

const { validateAccessToken } = require('./middlewares/auth');

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

// Rutas principales de la API v1
app.use('/api/v1', routes);

// Manejador de rutas no encontradas (404)
app.use((req, res, next) => {
  next(new NotFoundError(`La ruta '${req.method} ${req.originalUrl}' no existe en este servidor`, 'RUTA_NO_ENCONTRADA'));
});

// Middleware centralizado de errores
app.use(errorHandler);

if (require.main === module) {
  // Cargar modelos y asociaciones
  require('./models');

  connectDb()
    .then(() => {
      app.listen(port, () => {
        console.log(`API de Turnos escuchando en http://localhost:${port}`);
        console.log(`Documentación Swagger interactiva en http://localhost:${port}/api-docs`);
      });
    })
    .catch((error) => {
      console.error('Error conectando a PostgreSQL:', error.message);
      process.exit(1);
    });
}

module.exports = app;
