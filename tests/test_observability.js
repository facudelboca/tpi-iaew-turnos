require('dotenv').config();
const { requireEnv } = require('./helpers');
const { spawn } = require('child_process');

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

async function runObservabilityTests() {
  console.log('=== SUITE DE PRUEBAS DE OBSERVABILIDAD Y TELEMETRIA ===\n');

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
      throw new Error('No se pudo iniciar el servidor');
    }
  }

  try {
    console.log('1. Verificando generacion automatica de X-Correlation-ID...');
    const res1 = await fetch(`${BASE_URL}/health`);
    const corrIdAuto = res1.headers.get('x-correlation-id');
    if (!corrIdAuto) throw new Error('No se genero la cabecera X-Correlation-ID');
    console.log('   Correlation ID generado automáticamente:', corrIdAuto);

    console.log('\n2. Verificando propagacion de X-Correlation-ID provisto por el cliente...');
    const customCorrId = `corr-custom-${Date.now()}`;
    const res2 = await fetch(`${BASE_URL}/health`, {
      headers: { 'x-correlation-id': customCorrId }
    });
    const corrIdEcho = res2.headers.get('x-correlation-id');
    if (corrIdEcho !== customCorrId) {
      throw new Error(`Se esperaba ${customCorrId} pero se recibio ${corrIdEcho}`);
    }
    console.log('   Correlation ID propagado correctamente:', corrIdEcho);

    console.log('\n3. Verificando endpoint de metricas Prometheus GET /metrics...');
    const resMetrics = await fetch(`${BASE_URL}/metrics`);
    if (!resMetrics.ok) throw new Error(`HTTP ${resMetrics.status} al consultar /metrics`);
    const metricsBody = await resMetrics.text();

    const expectedMetrics = [
      'iaew_http_requests_total',
      'iaew_http_request_duration_seconds_bucket',
      'iaew_http_request_duration_seconds_sum',
      'iaew_http_request_duration_seconds_count',
      'iaew_turnos_reservados_total'
    ];

    for (const metric of expectedMetrics) {
      if (!metricsBody.includes(metric)) {
        throw new Error(`Metrica requerida no encontrada en /metrics: ${metric}`);
      }
    }
    console.log('   Metricas Prometheus expuestas correctamente en /metrics.');

    console.log('\n4. Verificando calculo de percentil p95 y resumen en /api/v1/metrics-summary...');
    const resSummary = await fetch(`${BASE_URL}/api/v1/metrics-summary`);
    if (!resSummary.ok) throw new Error(`HTTP ${resSummary.status} en /api/v1/metrics-summary`);
    const summary = await resSummary.json();
    console.log('   Resumen de telemetria:', JSON.stringify(summary));
    if (typeof summary.totalRequests !== 'number' || typeof summary.p95Ms !== 'number' || typeof summary.errorRate !== 'number') {
      throw new Error('Formato de resumen de metricas invalido');
    }
    if (summary.p95Ms <= 0 || summary.p95Ms > 5000) {
      throw new Error(`p95 fuera de rango esperado: ${summary.p95Ms}`);
    }
    if (summary.p95Ms < summary.p50Ms) {
      throw new Error('p95 no puede ser menor que p50');
    }

    console.log('\n5. Verificando disponibilidad del Dashboard visual GET /dashboard...');
    const resDash = await fetch(`${BASE_URL}/dashboard`);
    if (!resDash.ok) throw new Error(`HTTP ${resDash.status} al acceder a /dashboard`);
    const dashHtml = await resDash.text();
    if (!dashHtml.includes('metricsChart') || !dashHtml.toLowerCase().includes('chart.js')) {
      throw new Error('El dashboard no contiene los componentes visuales esperados');
    }
    console.log('   Dashboard interactivo disponible con exito en /dashboard.');

    console.log('\n6. Verificando trazabilidad y propagacion de Correlation ID a RabbitMQ y Worker...');
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
    const { access_token: token } = await tokenRes.json();

    const traceCorrId = `trace-iaew-${Date.now()}`;
    const baseFriday = new Date('2026-11-20T09:00:00.000Z');
    const offsetWeeks = Math.floor(Math.random() * 50) + 1;
    baseFriday.setDate(baseFriday.getDate() + (offsetWeeks * 7));
    const endFriday = new Date(baseFriday.getTime() + (30 * 60 * 1000));

    const postRes = await fetch(`${BASE_URL}/api/v1/turnos`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${token}`,
        'idempotency-key': `obs-test-${Date.now()}`,
        'x-correlation-id': traceCorrId
      },
      body: JSON.stringify({
        pacienteId: 1,
        profesionalId: 1,
        especialidadId: 1,
        fechaHoraInicio: baseFriday.toISOString(),
        fechaHoraFin: endFriday.toISOString(),
        motivoConsulta: 'Prueba de observabilidad distribuida',
        canalNotificacion: 'EMAIL'
      })
    });

    if (!postRes.ok) {
      const err = await postRes.text();
      throw new Error(`Error en reserva HTTP ${postRes.status}: ${err}`);
    }

    const postBody = await postRes.json();
    const turnoId = postBody.id || postBody.turno?.id || postBody.data?.id;
    console.log(`   Turno creado con ID: ${turnoId} bajo Correlation ID: ${traceCorrId}`);

    console.log('\n   Ejecutando worker brevemente para consumir el mensaje correlacionado:');
    const workerProc = spawn('node', ['src/worker.js'], {
      env: process.env,
      stdio: 'pipe'
    });

    let workerFoundCorr = false;
    workerProc.stdout.on('data', (d) => {
      const line = d.toString();
      if (line.includes(traceCorrId)) {
        workerFoundCorr = true;
      }
      process.stdout.write(`   [Worker Log JSON] ${line}`);
    });
    workerProc.stderr.on('data', (d) => process.stderr.write(`   [Worker Err] ${d}`));

    await sleep(3500);
    workerProc.kill('SIGTERM');

    if (!workerFoundCorr) {
      throw new Error(`El worker no registro el correlationId ${traceCorrId}`);
    }
    console.log('   Trazabilidad confirmada: el worker recibio y logueo el mismo correlationId.');

    console.log('\n=== SUITE DE OBSERVABILIDAD FINALIZADA CON EXITO ===');
  } finally {
    if (serverProcess) {
      serverProcess.kill('SIGTERM');
    }
  }
}

runObservabilityTests().catch((error) => {
  console.error('\nError en la prueba de observabilidad:', error);
  process.exit(1);
});
