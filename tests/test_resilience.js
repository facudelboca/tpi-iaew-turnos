require('dotenv').config();
const { spawn } = require('child_process');

const BASE_URL = 'http://localhost:3000';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getRabbitQueue(queueName) {
  const res = await fetch('http://localhost:15672/api/queues', {
    headers: {
      'Authorization': 'Basic ' + Buffer.from('iaew:iaew-local').toString('base64')
    }
  });
  if (!res.ok) return null;
  const queues = await res.json();
  return queues.find(q => q.name === queueName);
}

async function runTests() {
  console.log('=== SUITE DE PRUEBAS DE RESILIENCIA E IDEMPOTENCIA ===\n');

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

  const idempotencyKey = `turno-demo-${Date.now()}`;

  console.log('--- PRUEBA 1: Primera Reserva con Idempotency-Key ---');
  const payloadReserva1 = {
    pacienteId: 1,
    profesionalId: 1,
    fechaHoraInicio: '2026-11-27T09:00:00.000Z',
    fechaHoraFin: '2026-11-27T09:30:00.000Z',
    motivoConsulta: 'Chequeo con Idempotencia',
    canalNotificacion: 'EMAIL'
  };

  const res1 = await fetch(`${BASE_URL}/api/v1/turnos`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'Idempotency-Key': idempotencyKey
    },
    body: JSON.stringify(payloadReserva1)
  });

  const replayedHeader1 = res1.headers.get('idempotency-replayed');
  const data1 = await res1.json();
  console.log(`Status: ${res1.status} (Esperado: 201)`);
  console.log(`Header Idempotency-Replayed: ${replayedHeader1} (Esperado: false)`);
  console.log(`EventId generado: ${data1.evento?.eventId}`);

  console.log('\n--- PRUEBA 2: Replay con la misma clave ---');
  const res2 = await fetch(`${BASE_URL}/api/v1/turnos`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'Idempotency-Key': idempotencyKey
    },
    body: JSON.stringify(payloadReserva1)
  });

  const replayedHeader2 = res2.headers.get('idempotency-replayed');
  const data2 = await res2.json();
  console.log(`Status: ${res2.status} (Esperado: 200)`);
  console.log(`Header Idempotency-Replayed: ${replayedHeader2} (Esperado: true)`);
  console.log(`Mismo EventId preservado: ${data1.evento?.eventId === data2.evento?.eventId}`);

  console.log('\n--- PRUEBA 3: Validaciones y Conflictos 409 ---');
  const resFormatoInvalido = await fetch(`${BASE_URL}/api/v1/turnos`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'Idempotency-Key': 'corta'
    },
    body: JSON.stringify(payloadReserva1)
  });
  console.log(`[3a] Clave inválida (< 8 chars) -> Status: ${resFormatoInvalido.status} (Esperado: 400)`);

  const resMismatch = await fetch(`${BASE_URL}/api/v1/turnos`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'Idempotency-Key': idempotencyKey
    },
    body: JSON.stringify({ ...payloadReserva1, pacienteId: 2 })
  });
  const dataMismatch = await resMismatch.json();
  console.log(`[3b] Reutilización con otro paciente -> Status: ${resMismatch.status} (Esperado: 409)`, dataMismatch);

  console.log('\n--- PRUEBA 4: Deduplicación en el Worker ---');
  const workerProc = spawn('node', ['src/worker.js'], { stdio: 'pipe' });
  workerProc.stdout.on('data', d => process.stdout.write(`   [Worker stdout] ${d}`));
  workerProc.stderr.on('data', d => process.stdout.write(`   [Worker stderr] ${d}`));

  await sleep(3000);
  workerProc.kill();

  console.log('\n--- PRUEBA 5: Verificación de Topología en RabbitMQ ---');
  const mainQueue = await getRabbitQueue('notificaciones.turno-reservado');
  const retryQueue = await getRabbitQueue('notificaciones.turno-reservado.retry');
  const dlqQueue = await getRabbitQueue('notificaciones.turno-reservado.dlq');

  console.log(`Cola Principal (${mainQueue?.name}): existe = ${!!mainQueue}`);
  console.log(`Cola Retry con TTL (${retryQueue?.name}): existe = ${!!retryQueue}`);
  console.log(`Cola DLQ (${dlqQueue?.name}): existe = ${!!dlqQueue}`);

  console.log('\n=== SUITE DE PRUEBAS DE RESILIENCIA FINALIZADA ===');
}

runTests().catch(console.error);
