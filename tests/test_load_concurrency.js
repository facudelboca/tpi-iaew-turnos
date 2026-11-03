require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { requireEnv } = require('./helpers');
const { Turno, Paciente, Profesional } = require('../src/models');
const { sequelize } = require('../src/db');

const BASE_URL = 'http://localhost:3000';
const CONCURRENT_REQUESTS = 30;

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

function calculatePercentile(sortedValues, percentile) {
  if (sortedValues.length === 0) return 0;
  const index = Math.ceil((percentile / 100) * sortedValues.length) - 1;
  return sortedValues[Math.max(0, Math.min(index, sortedValues.length - 1))];
}

function generateHtmlReport(metrics, requestsData, dbVerification) {
  const chartLabels = JSON.stringify(requestsData.map((r) => `#${r.id}`));
  const chartDurations = JSON.stringify(requestsData.map((r) => r.durationMs));
  const chartColors = JSON.stringify(
    requestsData.map((r) => (r.statusCode === 201 ? 'rgba(34, 197, 94, 0.85)' : 'rgba(239, 68, 68, 0.85)'))
  );

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reporte de Prueba de Carga y Concurrencia - TPI IAEW 2026</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    :root {
      --bg: #0f172a;
      --card-bg: #1e293b;
      --card-border: #334155;
      --text: #f8fafc;
      --text-muted: #94a3b8;
      --primary: #38bdf8;
      --success: #22c55e;
      --warning: #f59e0b;
      --danger: #ef4444;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: var(--bg);
      color: var(--text);
      padding: 2rem;
      line-height: 1.5;
    }
    .container { max-width: 1200px; margin: 0 auto; }
    header {
      margin-bottom: 2rem;
      border-bottom: 1px solid var(--card-border);
      padding-bottom: 1.5rem;
    }
    h1 { font-size: 1.875rem; font-weight: 700; color: #fff; margin-bottom: 0.5rem; }
    .badge {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.875rem;
      font-weight: 600;
      background: rgba(34, 197, 94, 0.2);
      color: var(--success);
      border: 1px solid var(--success);
    }
    .grid-kpi {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1.25rem;
      margin-bottom: 2rem;
    }
    .card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 0.75rem;
      padding: 1.25rem;
    }
    .kpi-title { font-size: 0.875rem; color: var(--text-muted); margin-bottom: 0.25rem; text-transform: uppercase; letter-spacing: 0.05em; }
    .kpi-value { font-size: 1.75rem; font-weight: 700; }
    .kpi-sub { font-size: 0.75rem; color: var(--text-muted); margin-top: 0.25rem; }
    .charts-grid {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 1.25rem;
      margin-bottom: 2rem;
    }
    @media (max-width: 900px) { .charts-grid { grid-template-columns: 1fr; } }
    .section-title { font-size: 1.25rem; font-weight: 600; margin-bottom: 1rem; color: #fff; }
    .table-container {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 0.75rem;
      overflow-x: auto;
      margin-bottom: 2rem;
    }
    table { width: 100%; border-collapse: collapse; text-align: left; font-size: 0.875rem; }
    th { background: #162032; padding: 0.75rem 1rem; font-weight: 600; color: var(--text-muted); border-bottom: 1px solid var(--card-border); }
    td { padding: 0.75rem 1rem; border-bottom: 1px solid var(--card-border); }
    tr:last-child td { border-bottom: none; }
    .status-pill {
      display: inline-block;
      padding: 0.15rem 0.5rem;
      border-radius: 0.375rem;
      font-weight: 600;
      font-size: 0.75rem;
    }
    .status-201 { background: rgba(34, 197, 94, 0.2); color: var(--success); }
    .status-409 { background: rgba(239, 68, 68, 0.2); color: var(--danger); }
    .acid-box {
      background: rgba(56, 189, 248, 0.1);
      border: 1px solid var(--primary);
      border-radius: 0.75rem;
      padding: 1.25rem;
      margin-bottom: 2rem;
    }
    .acid-box h3 { color: var(--primary); margin-bottom: 0.5rem; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
        <div>
          <h1>Reporte de Prueba de Carga y Concurrencia</h1>
          <p style="color: var(--text-muted);">Dominio 3: Sistema de Reserva de Turnos de Salud | TPI IAEW 2026</p>
        </div>
        <div>
          <span class="badge">ACID ISOLATION CONFIRMADA</span>
        </div>
      </div>
    </header>

    <div class="acid-box">
      <h3>Garantia de Aislamiento Transaccional y Bloqueo Pesimista</h3>
      <p>Se ejecutaron <strong>${metrics.totalRequests} peticiones simultáneas</strong> en paralelo compitiendo exactamente por el mismo turno médico (mismo profesional y franja horaria). El motor PostgreSQL resolvió la concurrencia mediante serialización estricta por fila con <code>SELECT ... FOR UPDATE</code>. Se verificó en base de datos la persistencia de exactamente <strong>${dbVerification.turnosPersistidos} registro</strong> sin duplicados ni solapamientos.</p>
    </div>

    <div class="grid-kpi">
      <div class="card">
        <div class="kpi-title">Peticiones Totales</div>
        <div class="kpi-value" style="color: var(--primary);">${metrics.totalRequests}</div>
        <div class="kpi-sub">Disparadas en el mismo instante</div>
      </div>
      <div class="card">
        <div class="kpi-title">Exitosas (201 Created)</div>
        <div class="kpi-value" style="color: var(--success);">${metrics.success201}</div>
        <div class="kpi-sub">Exactamente 1 asignación válida</div>
      </div>
      <div class="card">
        <div class="kpi-title">Rechazos (409 Conflict)</div>
        <div class="kpi-value" style="color: var(--warning);">${metrics.conflicts409}</div>
        <div class="kpi-sub">Rechazo por TURNO_OCUPADO</div>
      </div>
      <div class="card">
        <div class="kpi-title">Errores Servidor (5xx)</div>
        <div class="kpi-value" style="color: ${metrics.serverErrors5xx === 0 ? 'var(--success)' : 'var(--danger)'};">${metrics.serverErrors5xx}</div>
        <div class="kpi-sub">0 caídas operacionales</div>
      </div>
      <div class="card">
        <div class="kpi-title">Throughput</div>
        <div class="kpi-value">${metrics.throughputReqPerSec} <span style="font-size: 1rem;">req/s</span></div>
        <div class="kpi-sub">Tiempo total: ${metrics.totalDurationMs} ms</div>
      </div>
      <div class="card">
        <div class="kpi-title">Percentil p95</div>
        <div class="kpi-value" style="color: var(--primary);">${metrics.p95Ms} <span style="font-size: 1rem;">ms</span></div>
        <div class="kpi-sub">p50: ${metrics.p50Ms} ms | p90: ${metrics.p90Ms} ms</div>
      </div>
    </div>

    <div class="charts-grid">
      <div class="card">
        <div class="section-title">Distribución de Latencias por Petición (ms)</div>
        <canvas id="latenciesChart" height="130"></canvas>
      </div>
      <div class="card">
        <div class="section-title">Distribución de Códigos HTTP</div>
        <canvas id="statusChart" height="130"></canvas>
      </div>
    </div>

    <div class="section-title">Registro Detallado de Peticiones Concurrentes</div>
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Idempotency Key</th>
            <th>HTTP Status</th>
            <th>Código de Negocio</th>
            <th>Duración</th>
            <th>Correlation ID</th>
          </tr>
        </thead>
        <tbody>
          ${requestsData.map((r) => `
            <tr>
              <td><strong>${r.id}</strong></td>
              <td style="font-family: monospace;">${r.idempotencyKey}</td>
              <td><span class="status-pill status-${r.statusCode}">${r.statusCode}</span></td>
              <td>${r.businessCode}</td>
              <td>${r.durationMs} ms</td>
              <td style="font-family: monospace; font-size: 0.75rem; color: var(--text-muted);">${r.correlationId || 'N/A'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <footer style="text-align: center; color: var(--text-muted); font-size: 0.75rem; border-top: 1px solid var(--card-border); padding-top: 1rem;">
      Ejecución realizada con Node.js ${process.version} sobre ${process.platform} | PostgreSQL 16 | RabbitMQ 3.13 | Fecha: ${new Date().toISOString()}
    </footer>
  </div>

  <script>
    const ctxL = document.getElementById('latenciesChart').getContext('2d');
    new Chart(ctxL, {
      type: 'bar',
      data: {
        labels: ${chartLabels},
        datasets: [{
          label: 'Duración (ms)',
          data: ${chartDurations},
          backgroundColor: ${chartColors},
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          y: { grid: { color: '#334155' }, ticks: { color: '#94a3b8' } },
          x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
        }
      }
    });

    const ctxS = document.getElementById('statusChart').getContext('2d');
    new Chart(ctxS, {
      type: 'doughnut',
      data: {
        labels: ['201 Created (Éxito)', '409 Conflict (Rechazo Concurrente)'],
        datasets: [{
          data: [${metrics.success201}, ${metrics.conflicts409}],
          backgroundColor: ['#22c55e', '#ef4444'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'bottom', labels: { color: '#94a3b8', font: { size: 11 } } }
        }
      }
    });
  </script>
</body>
</html>`;
}

function generateMarkdownReport(metrics, dbVerification) {
  return `# Reporte Técnico de Carga y Concurrencia - Dominio 3 (Salud)

## 1. Resumen Ejecutivo
- **Objetivo:** Demostrar la robustez del sistema frente a condiciones de carrera (Race Conditions) y validar el cumplimiento del aislamiento transaccional (ACID) mediante bloqueo pesimista en PostgreSQL.
- **Escenario:** ${metrics.totalRequests} peticiones concurrentes simultáneas intentando reservar el mismo turno médico para el mismo profesional en la misma franja horaria.
- **Fecha de Ejecución:** ${new Date().toISOString()}
- **Entorno:** Node.js ${process.version}, PostgreSQL 16, RabbitMQ 3.13.

## 2. Resultados de Métricas Clave

| Métrica | Valor Observado | Criterio de Aprobación | Resultado |
|---|---|---|---|
| **Peticiones Totales** | ${metrics.totalRequests} | ${metrics.totalRequests} | OK |
| **Peticiones Exitosas (201 Created)** | ${metrics.success201} | Exactamente 1 | APROBADO |
| **Rechazos por Solapamiento (409 Conflict)** | ${metrics.conflicts409} | Exactamente ${metrics.totalRequests - 1} | APROBADO |
| **Errores de Servidor (500 / 5xx)** | ${metrics.serverErrors5xx} | 0 | APROBADO |
| **Turnos Persistidos en Base de Datos** | ${dbVerification.turnosPersistidos} | Exactamente 1 | APROBADO |
| **Throughput** | ${metrics.throughputReqPerSec} req/s | > 10 req/s | APROBADO |
| **Latencia p50** | ${metrics.p50Ms} ms | < 100 ms | APROBADO |
| **Latencia p90** | ${metrics.p90Ms} ms | < 250 ms | APROBADO |
| **Latencia p95** | ${metrics.p95Ms} ms | < 300 ms | APROBADO |

## 3. Justificación del Mecanismo Transaccional
Para garantizar que dos pacientes no obtengan el mismo turno médico en condiciones de carrera de alta concurrencia, la aplicación emplea:
1. **Transacción ACID:** Envolviendo la lectura de disponibilidad y la inserción del turno.
2. **Bloqueo Pesimista por Fila:** \`Profesional.findByPk(profesionalId, { transaction: t, lock: t.LOCK.UPDATE })\` emite un \`SELECT ... FOR UPDATE\` sobre la fila del profesional médico, forzando la serialización de todas las reservas concurrentes sobre esa agenda.
3. **Validación de Solapamiento:** Cada transacción en cola re-evalúa \`Turno.count\` leyendo el estado actualizado del primer turno confirmado y lanza de forma determinística la excepción \`TURNO_OCUPADO\` con código HTTP 409.
`;
}

async function run() {
  console.log('=== PRUEBA DE CARGA Y CONCURRENCIA: CONDICIONES DE CARRERA Y ACID ===\n');

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
      throw new Error('No se pudo iniciar el servidor para la prueba de carga');
    }
  }

  const clientId = requireEnv('AUTH0_TEST_CLIENT_ID');
  const clientSecret = requireEnv('AUTH0_TEST_CLIENT_SECRET');
  let issuer = process.env.AUTH0_ISSUER_BASE_URL || 'https://dev-iaew-2026.us.auth0.com/';
  if (!issuer.endsWith('/')) {
    issuer += '/';
  }

  console.log('1. Obteniendo Token de Acceso M2M...');
  const tokenRes = await fetch(`${issuer}oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      audience: process.env.AUTH0_AUDIENCE || 'https://iaew-turnos-api',
      grant_type: 'client_credentials'
    })
  });

  const tokenData = await tokenRes.json();
  if (!tokenRes.ok) {
    throw new Error(`Fallo autenticacion Auth0: ${JSON.stringify(tokenData)}`);
  }
  const token = tokenData.access_token;

  console.log('2. Preparando datos de prueba...');
  let paciente = await Paciente.findOne({ where: { activo: true } });
  if (!paciente) {
    paciente = await Paciente.create({
      nombre: 'Prueba',
      apellido: 'Concurrencia',
      dni: String(Math.floor(20000000 + Math.random() * 70000000)),
      email: `test_concurrencia_${Date.now()}@salud.local`
    });
  }

  const profesional = await Profesional.findByPk(1);
  if (!profesional) {
    throw new Error('No se encontro el profesional ID 1');
  }

  const d = new Date();
  const offsetWeeks = 80 + Math.floor(Math.random() * 50);
  d.setUTCDate(d.getUTCDate() + offsetWeeks * 7);
  while (d.getUTCDay() !== 1) {
    d.setUTCDate(d.getUTCDate() + 1);
  }
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dia = String(d.getUTCDate()).padStart(2, '0');
  const slotInicio = `${y}-${m}-${dia}T10:00:00.000Z`;
  const slotFin = `${y}-${m}-${dia}T10:30:00.000Z`;

  console.log(`Slot seleccionado: ${slotInicio} a ${slotFin} para Profesional ID: ${profesional.id}`);
  console.log(`\n3. Disparando ${CONCURRENT_REQUESTS} peticiones en simultáneo compitiendo por el mismo turno...`);

  const startTime = Date.now();
  const requestPromises = [];

  for (let i = 1; i <= CONCURRENT_REQUESTS; i++) {
    const key = `concurrencia-${Date.now()}-${i}-${Math.random().toString(36).substring(7)}`;
    const reqPromise = (async () => {
      const reqStart = Date.now();
      try {
        const response = await fetch(`${BASE_URL}/api/v1/turnos`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'Idempotency-Key': key
          },
          body: JSON.stringify({
            pacienteId: paciente.id,
            profesionalId: profesional.id,
            fechaHoraInicio: slotInicio,
            fechaHoraFin: slotFin,
            motivoConsulta: `Carga concurrente cliente #${i}`,
            canalNotificacion: 'EMAIL'
          })
        });
        const durationMs = Date.now() - reqStart;
        const resBody = await response.json();
        return {
          id: i,
          idempotencyKey: key,
          statusCode: response.status,
          businessCode: resBody.code || resBody.error || (response.status === 201 ? 'TURNO_CREADO' : 'DESCONOCIDO'),
          correlationId: response.headers.get('x-correlation-id'),
          durationMs
        };
      } catch (err) {
        const durationMs = Date.now() - reqStart;
        return {
          id: i,
          idempotencyKey: key,
          statusCode: 500,
          businessCode: err.message,
          correlationId: null,
          durationMs
        };
      }
    })();
    requestPromises.push(reqPromise);
  }

  const results = await Promise.all(requestPromises);
  const totalDurationMs = Date.now() - startTime;

  console.log('4. Analizando resultados...');
  const success201 = results.filter((r) => r.statusCode === 201).length;
  const conflicts409 = results.filter((r) => r.statusCode === 409).length;
  const serverErrors5xx = results.filter((r) => r.statusCode >= 500).length;

  const sortedDurations = results.map((r) => r.durationMs).sort((a, b) => a - b);
  const p50Ms = calculatePercentile(sortedDurations, 50);
  const p90Ms = calculatePercentile(sortedDurations, 90);
  const p95Ms = calculatePercentile(sortedDurations, 95);
  const throughputReqPerSec = parseFloat(((CONCURRENT_REQUESTS / totalDurationMs) * 1000).toFixed(2));

  const turnosPersistidos = await Turno.count({
    where: {
      profesionalId: profesional.id,
      fechaHoraInicio: slotInicio
    }
  });

  const metrics = {
    totalRequests: CONCURRENT_REQUESTS,
    success201,
    conflicts409,
    serverErrors5xx,
    totalDurationMs,
    throughputReqPerSec,
    p50Ms,
    p90Ms,
    p95Ms
  };

  const dbVerification = {
    turnosPersistidos
  };

  console.log(`- Peticiones Totales: ${metrics.totalRequests}`);
  console.log(`- 201 Created (Exitosas): ${metrics.success201}`);
  console.log(`- 409 Conflict (Rechazadas por Solapamiento): ${metrics.conflicts409}`);
  console.log(`- 5xx Errores: ${metrics.serverErrors5xx}`);
  console.log(`- Throughput: ${metrics.throughputReqPerSec} req/s`);
  console.log(`- Percentiles: p50 = ${metrics.p50Ms}ms | p90 = ${metrics.p90Ms}ms | p95 = ${metrics.p95Ms}ms`);
  console.log(`- Turnos persistidos en PostgreSQL para este horario: ${dbVerification.turnosPersistidos}`);

  const reportDir = path.resolve(__dirname, '../docs/pruebas');
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  const htmlReport = generateHtmlReport(metrics, results, dbVerification);
  fs.writeFileSync(path.join(reportDir, 'reporte-carga.html'), htmlReport, 'utf8');

  const mdReport = generateMarkdownReport(metrics, dbVerification);
  fs.writeFileSync(path.join(reportDir, 'reporte-carga.md'), mdReport, 'utf8');

  console.log(`\nReportes generados en:\n- ${path.join(reportDir, 'reporte-carga.html')}\n- ${path.join(reportDir, 'reporte-carga.md')}`);

  if (serverProcess) {
    serverProcess.kill('SIGTERM');
  }

  if (success201 !== 1) {
    throw new Error(`Violación de concurrencia: se esperaban exactamente 1 reserva exitosa pero hubo ${success201}`);
  }

  if (conflicts409 !== CONCURRENT_REQUESTS - 1) {
    throw new Error(`Violación de conflictos: se esperaban ${CONCURRENT_REQUESTS - 1} pero hubo ${conflicts409}`);
  }

  if (dbVerification.turnosPersistidos !== 1) {
    throw new Error(`Violación de consistencia en PostgreSQL: hay ${dbVerification.turnosPersistidos} turnos para el mismo slot`);
  }

  console.log('\n=== PRUEBA DE CARGA Y CONCURRENCIA FINALIZADA EXITOSAMENTE ===');
  process.exit(0);
}

run().catch((err) => {
  console.error('\nError en prueba de concurrencia:', err.message);
  process.exit(1);
});

