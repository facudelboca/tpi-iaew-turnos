require('dotenv').config();
const { spawn } = require('child_process');
const { publicarTurnoReservado, confirmedPublish, DLX, DLQ_ROUTING_KEY, crearCanal, QUEUE } = require('../src/lib/rabbit');

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runDedupAndDlqTest() {
  console.log('=== PRUEBA DE DEDUPLICACIÓN Y RETRY/DLQ ===\n');

  // 1. Probar republicar el evento que ya fue procesado (turno 7, eventId anterior)
  console.log('1. Republicando evento duplicado a RabbitMQ...');
  const eventoDuplicado = {
    eventId: 'c45ec968-eb98-4133-b1cc-57175ba184d3',
    type: 'turno.reservado',
    version: 1,
    occurredAt: new Date().toISOString(),
    data: { turnoId: 7 }
  };

  await publicarTurnoReservado(eventoDuplicado);
  console.log('   Mensaje duplicado publicado en la cola.');

  console.log('2. Iniciando worker para verificar detección de duplicado:');
  const workerProc = spawn('node', ['src/worker.js'], { stdio: 'pipe' });
  workerProc.stdout.on('data', d => process.stdout.write(`   [Worker stdout] ${d}`));
  workerProc.stderr.on('data', d => process.stdout.write(`   [Worker stderr] ${d}`));

  await sleep(3000);
  workerProc.kill();

  console.log('\n=== PRUEBA DE DEDUPLICACIÓN COMPLETADA ===');
}

runDedupAndDlqTest().catch(console.error);
