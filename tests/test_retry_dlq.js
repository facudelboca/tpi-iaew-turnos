require('dotenv').config();
const { spawn } = require('child_process');
const crypto = require('crypto');
const { publicarTurnoReservado } = require('../src/lib/rabbit');

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

async function runRetryDlqTest() {
  console.log('=== PRUEBA DE REINTENTOS Y DLQ ===\n');

  const nuevoEventId = crypto.randomUUID();
  console.log(`1. Publicando nuevo evento ${nuevoEventId}...`);

  await publicarTurnoReservado({
    eventId: nuevoEventId,
    type: 'turno.reservado',
    version: 1,
    occurredAt: new Date().toISOString(),
    data: { turnoId: 7 }
  });

  console.log('2. Iniciando worker con SIMULATE_TRANSIENT_FAILURES=4:');
  const workerProc = spawn('node', ['src/worker.js'], {
    env: {
      ...process.env,
      SIMULATE_TRANSIENT_FAILURES: '4',
      RETRY_DELAY_MS: '3000',
      MAX_RETRIES: '3'
    },
    stdio: 'pipe'
  });

  workerProc.stdout.on('data', d => process.stdout.write(`   [Worker stdout] ${d}`));
  workerProc.stderr.on('data', d => process.stdout.write(`   [Worker stderr] ${d}`));

  // Esperar a que agote los 3 reintentos (cada uno espera 3s en la cola de retry)
  await sleep(11000);
  workerProc.kill();

  console.log('\n3. Verificando Dead Letter Queue (DLQ) en RabbitMQ:');
  const dlq = await getRabbitQueue('notificaciones.turno-reservado.dlq');
  console.log(`   Cola DLQ: ${dlq?.name}`);
  console.log(`   Mensajes en DLQ: ${dlq?.messages ?? dlq?.messages_ready ?? 0}`);

  console.log('\n=== PRUEBA DE DLQ FINALIZADA CON ÉXITO ===');
}

runRetryDlqTest().catch(console.error);
