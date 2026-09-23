require('dotenv').config();
const express = require('express');
const { connectDb } = require('./db');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

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
  connectDb()
    .then(() => {
      app.listen(port, () => {
        console.log(`API placeholder escuchando en http://localhost:${port}`);
      });
    })
    .catch((error) => {
      console.error('Error conectando a MongoDB:', error.message);
      process.exit(1);
    });
}

module.exports = app;
