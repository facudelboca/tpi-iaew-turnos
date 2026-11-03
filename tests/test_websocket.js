require('dotenv').config();
const { requireEnv } = require('./helpers');
const { WebSocket } = require('ws');
const { spawn } = require('child_process');

const BASE_URL = 'http://localhost:3000';
const WS_URL = 'ws://localhost:3000/ws/agenda';

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

async function runWebSocketTest() {
  console.log('=== PRUEBA DE INTEGRACION EN TIEMPO REAL CON WEBSOCKET ===\n');

  let serverProcess = null;
  const running = await isServerRunning();

  if (!running) {
    console.log('Iniciando servidor de la API...');
    serverProcess = spawn('node', ['src/app.js'], {
      env: process.env,
      stdio: 'pipe'
    });

    serverProcess.stdout.on('data', (d) => process.stdout.write(`   [API] ${d}`));
    serverProcess.stderr.on('data', (d) => process.stderr.write(`   [API Error] ${d}`));

    let attempts = 0;
    while (attempts < 20) {
      await sleep(500);
      if (await isServerRunning()) break;
      attempts++;
    }

    if (!await isServerRunning()) {
      throw new Error('No se pudo iniciar el servidor de la API');
    }
  }

  try {
    console.log('1. Conectando cliente al WebSocket en ' + WS_URL + '...');
    const ws = new WebSocket(WS_URL);
    const receivedMessages = [];

    const waitForMessage = (predicate, timeoutMs = 6000) => {
      return new Promise((resolve, reject) => {
        const startTime = Date.now();
        const interval = setInterval(() => {
          const found = receivedMessages.find(predicate);
          if (found) {
            clearInterval(interval);
            resolve(found);
          } else if (Date.now() - startTime > timeoutMs) {
            clearInterval(interval);
            reject(new Error(`Timeout esperando mensaje WebSocket (${timeoutMs}ms)`));
          }
        }, 100);
      });
    };

    await new Promise((resolve, reject) => {
      ws.on('open', resolve);
      ws.on('error', reject);
    });

    ws.on('message', (data) => {
      try {
        const parsed = JSON.parse(data.toString());
        receivedMessages.push(parsed);
      } catch (err) {
      }
    });

    console.log('   Conexión WebSocket establecida exitosamente.');

    console.log('\n2. Esperando mensaje de bienvenida...');
    const welcomeMsg = await waitForMessage((m) => m.tipo === 'CONEXION_ESTABLECIDA');
    console.log('   Mensaje recibido:', JSON.stringify(welcomeMsg));

    console.log('\n3. Probando comunicacion bidireccional PING / PONG...');
    ws.send(JSON.stringify({ accion: 'PING' }));
    const pongMsg = await waitForMessage((m) => m.tipo === 'PONG');
    console.log('   PONG recibido:', JSON.stringify(pongMsg));

    console.log('\n4. Obteniendo token de Auth0...');
    const clientId = requireEnv('AUTH0_TEST_CLIENT_ID');
    const clientSecret = requireEnv('AUTH0_TEST_CLIENT_SECRET');

    const tokenRes = await fetch(`${process.env.AUTH0_ISSUER_BASE_URL}oauth/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        audience: process.env.AUTH0_AUDIENCE,
        grant_type: 'client_credentials'
      })
    });

    const tokenData = await tokenRes.json();
    const token = tokenData.access_token;
    console.log('   Token obtenido.');

    console.log('\n5. Reservando nuevo turno via HTTP REST...');
    const baseFriday = new Date('2026-11-20T09:00:00.000Z');
    const offsetWeeks = Math.floor(Math.random() * 50) + 1;
    baseFriday.setDate(baseFriday.getDate() + (offsetWeeks * 7));
    const endFriday = new Date(baseFriday.getTime() + (30 * 60 * 1000));

    const postRes = await fetch(`${BASE_URL}/api/v1/turnos`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${token}`,
        'idempotency-key': `ws-test-${Date.now()}`
      },
      body: JSON.stringify({
        pacienteId: 1,
        profesionalId: 1,
        especialidadId: 1,
        fechaHoraInicio: baseFriday.toISOString(),
        fechaHoraFin: endFriday.toISOString(),
        motivoConsulta: 'Consulta prueba WebSocket en vivo',
        canalNotificacion: 'EMAIL'
      })
    });

    if (!postRes.ok) {
      const errBody = await postRes.text();
      throw new Error(`Fallo al reservar turno HTTP ${postRes.status}: ${errBody}`);
    }

    const postData = await postRes.json();
    const turnoId = postData.id || postData.turno?.id || postData.data?.id;
    console.log(`   Turno reservado exitosamente con ID: ${turnoId}`);

    console.log('\n6. Esperando evento TURNO_RESERVADO transmitido por WebSocket...');
    const reservaEvent = await waitForMessage((m) => m.tipo === 'TURNO_RESERVADO' && m.data?.turnoId === turnoId);
    console.log('   Evento WebSocket TURNO_RESERVADO recibido:');
    console.log(JSON.stringify(reservaEvent, null, 2));

    console.log('\n7. Cancelando el turno via HTTP REST...');
    const cancelRes = await fetch(`${BASE_URL}/api/v1/turnos/${turnoId}`, {
      method: 'DELETE',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        motivoCancelacion: 'Cancelado durante prueba automatizada de WebSocket'
      })
    });

    if (!cancelRes.ok) {
      const errBody = await cancelRes.text();
      throw new Error(`Fallo al cancelar turno HTTP ${cancelRes.status}: ${errBody}`);
    }

    console.log(`   Turno ${turnoId} cancelado exitosamente via HTTP.`);

    console.log('\n8. Esperando evento TURNO_CANCELADO transmitido por WebSocket...');
    const cancelEvent = await waitForMessage((m) => m.tipo === 'TURNO_CANCELADO' && m.data?.turnoId === turnoId);
    console.log('   Evento WebSocket TURNO_CANCELADO recibido:');
    console.log(JSON.stringify(cancelEvent, null, 2));

    console.log('\n9. Cerrando conexion WebSocket...');
    ws.close();

    console.log('\n=== PRUEBA DE WEBSOCKET FINALIZADA CON EXITO ===');
  } finally {
    if (serverProcess) {
      serverProcess.kill('SIGTERM');
    }
  }
}

runWebSocketTest().catch((error) => {
  console.error('\nError en la prueba de WebSocket:', error);
  process.exit(1);
});

