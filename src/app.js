require('dotenv').config();
const express = require('express');
const { connectDb } = require('./db');

const app = express();
const port = process.env.PORT || 3000;
const swaggerUi = require("swagger-ui-express");
const openapiSpec = require("../docs/openapi.json");
app.use(express.json());
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(openapiSpec));
// Endpoint base / placeholder
app.get('/', (req, res) => {
  res.json({
    mensaje: 'API de Reserva de Turnos de Salud (IAEW 2026)',
    estado: 'Esqueleto inicial en ejecución'
  });
});

// Endpoint de Health Check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'iaew-turnos-api',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

if (require.main === module) {
  // Cargar modelos y asociaciones
  require('./models');

  connectDb()
    .then(() => {
      app.listen(port, () => {
        console.log(`API placeholder escuchando en http://localhost:${port}`);
          console.log(`Docs en http://localhost:${port}/api-docs`);
      });
    })
    .catch((error) => {
      console.error('Error conectando a PostgreSQL:', error.message);
      process.exit(1);
    });
}

module.exports = app;
