require('dotenv').config();
const path = require('path');
const { spawn } = require('child_process');
const newman = require('newman');
const { requireEnv } = require('./helpers');

const BASE_URL = 'http://localhost:3000';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function isServerRunning() {
  try {
    const res = await fetch(`${BASE_URL}/health`);
    return res.ok;
  } catch {
    return false;
  }
}

async function run() {
  console.log('=== EJECUCIÓN AUTOMATIZADA DE PRUEBAS POSTMAN (NEWMAN) ===\n');

  let serverProcess = null;
  const running = await isServerRunning();

  if (!running) {
    console.log('Iniciando servidor de la API...');
    serverProcess = spawn('node', ['src/app.js'], {
      env: process.env,
      stdio: 'pipe'
    });

    let attempts = 0;
    while (attempts < 20) {
      await sleep(500);
      if (await isServerRunning()) break;
      attempts++;
    }

    if (!await isServerRunning()) {
      throw new Error('No se pudo iniciar el servidor para las pruebas de Postman');
    }
  }

  const clientId = requireEnv('AUTH0_TEST_CLIENT_ID');
  const clientSecret = requireEnv('AUTH0_TEST_CLIENT_SECRET');
  let issuer = process.env.AUTH0_ISSUER_BASE_URL || 'https://dev-iaew-2026.us.auth0.com/';
  if (!issuer.endsWith('/')) {
    issuer += '/';
  }

  const collectionPath = path.resolve(__dirname, '../docs/postman/Turnos_Salud_IAEW.postman_collection.json');
  const environmentPath = path.resolve(__dirname, '../docs/postman/Turnos_Local.postman_environment.json');

  const envValues = [
    { key: 'baseUrl', value: BASE_URL, enabled: true },
    { key: 'auth0Issuer', value: issuer, enabled: true },
    { key: 'auth0Audience', value: process.env.AUTH0_AUDIENCE || 'https://iaew-turnos-api', enabled: true },
    { key: 'auth0ClientId', value: clientId, enabled: true },
    { key: 'auth0ClientSecret', value: clientSecret, enabled: true },
    { key: 'apiKey', value: process.env.INTERNAL_API_KEY || 'iaew-turnos-secret-api-key-2026', enabled: true }
  ];

  newman.run({
    collection: collectionPath,
    environment: {
      name: 'Turnos_Local_Automated',
      values: envValues
    },
    reporters: ['cli'],
    bail: false
  }, function (err, summary) {
    if (serverProcess) {
      serverProcess.kill('SIGTERM');
    }

    if (err) {
      console.error('Error fatal al ejecutar Newman:', err);
      process.exit(1);
    }

    const failures = summary.run.failures;
    if (failures && failures.length > 0) {
      console.error(`\nNewman reporta ${failures.length} aserciones fallidas.`);
      process.exit(1);
    }

    console.log('\n=== SUITE POSTMAN FINALIZADA CON 100% DE PRUEBAS APROBADAS ===');
    process.exit(0);
  });
}

run().catch((err) => {
  console.error('Error en ejecucion:', err);
  process.exit(1);
});

