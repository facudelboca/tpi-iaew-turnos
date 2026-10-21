require('dotenv').config();
const { spawn } = require('child_process');

const BASE_URL = 'http://localhost:3000';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getRabbitQueueInfo() {
  const res = await fetch('http://localhost:15672/api/queues', {
    headers: {
      'Authorization': 'Basic ' + Buffer.from('iaew:iaew-local').toString('base64')
    }
  });
  if (!res.ok) return null;
  const queues = await res.json();
  return queues.find(q => q.name === 'notificaciones.turno-reservado');
}

async function runDemoDesacople() {
  console.log('=== DEMOSTRACIÓN DE MENSAJERÍA Y DESACOPLE ===\n');

  console.log('1. Obteniendo token de Auth0...');
  const clientId = 'k5zaa6rg7mXGzbNJYqmThdSA80PKB9tj';
  const clientSecret = '8s5xt57f0iYGAQHg8_JA8vbc5ddekz4e8ZvcEffxqlZP7ib4ZjlEfj7aM_25nvCq';

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
  const { access_token: token } = await tokenRes.json();
  console.log('   Token obtenido.');

  const baseFriday = new Date('2026-11-20T09:00:00.000Z');
  const offsetWeeks = Math.floor(Math.random() * 40) + 1;
  baseFriday.setDate(baseFriday.getDate() + (offsetWeeks * 7));
  const endFriday = new Date(baseFriday.getTime() + (30 * 60 * 1000));

  console.log('\n2. Reservando turno con WORKER DETENIDO...');
  const resReserva = await fetch(`${BASE_URL}/api/v1/turnos`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'Idempotency-Key': `msg-test-${Date.now()}`
    },
    body: JSON.stringify({
      pacienteId: 1,
      profesionalId: 1,
      fechaHoraInicio: baseFriday.toISOString(),
      fechaHoraFin: endFriday.toISOString(),
      motivoConsulta: 'Prueba de desacople con RabbitMQ',
      canalNotificacion: 'EMAIL'
    })
  });

  const turnoCreado = await resReserva.json();
  console.log(`   Reserva respondida -> HTTP ${resReserva.status} (ID de Turno: ${turnoCreado.id})`);
  console.log('   Evento publicado en RabbitMQ:', turnoCreado.evento);

  const resTurnoAntes = await fetch(`${BASE_URL}/api/v1/turnos/${turnoCreado.id}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const turnoAntes = await resTurnoAntes.json();
  console.log(`\n3. Estado del turno en DB (antes del worker): recordatorioEnviado = ${turnoAntes.recordatorioEnviado}`);

  await sleep(1000);
  const queueInfoAntes = await getRabbitQueueInfo();
  console.log(`4. Estado de RabbitMQ (cola notificaciones.turno-reservado):`);
  console.log(`   Mensajes en Ready: ${queueInfoAntes?.messages_ready ?? queueInfoAntes?.messages ?? 0}`);

  console.log('\n5. Iniciando el Worker (npm run worker)...');
  const workerProc = spawn('node', ['src/worker.js'], { stdio: 'pipe' });

  workerProc.stdout.on('data', (d) => process.stdout.write(`   [Worker stdout] ${d}`));
  workerProc.stderr.on('data', (d) => process.stdout.write(`   [Worker stderr] ${d}`));

  await sleep(3500);

  const resTurnoDespues = await fetch(`${BASE_URL}/api/v1/turnos/${turnoCreado.id}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const turnoDespues = await resTurnoDespues.json();
  console.log(`\n6. Estado del turno en DB (después del worker):`);
  console.log(`   recordatorioEnviado = ${turnoDespues.recordatorioEnviado}`);
  console.log(`   fechaRecordatorio   = ${turnoDespues.fechaRecordatorio}`);

  const queueInfoDespues = await getRabbitQueueInfo();
  console.log(`\n7. Estado final en RabbitMQ:`);
  console.log(`   Mensajes en Ready: ${queueInfoDespues?.messages_ready ?? 0}`);

  workerProc.kill();
  console.log('\n=== DEMOSTRACIÓN DE MENSAJERÍA COMPLETADA ===');
}

runDemoDesacople().catch(console.error);
