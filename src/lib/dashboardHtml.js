function getDashboardHtml() {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Observabilidad y Telemetría — Turnos Salud IAEW 2026</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    :root {
      --bg: #0f172a;
      --card: #1e293b;
      --border: #334155;
      --text: #f8fafc;
      --muted: #94a3b8;
      --primary: #38bdf8;
      --success: #4ade80;
      --warning: #fbbf24;
      --danger: #f87171;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: var(--bg);
      color: var(--text);
      padding: 24px;
      line-height: 1.5;
    }
    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--border);
    }
    h1 { font-size: 1.5rem; font-weight: 700; color: var(--text); }
    .status-badge {
      display: flex;
      align-items: center;
      gap: 8px;
      background: rgba(74, 222, 128, 0.1);
      border: 1px solid var(--success);
      color: var(--success);
      padding: 6px 14px;
      border-radius: 9999px;
      font-size: 0.875rem;
      font-weight: 600;
    }
    .pulse {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--success);
      box-shadow: 0 0 8px var(--success);
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }
    .card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 20px;
    }
    .card-title {
      font-size: 0.8125rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--muted);
      margin-bottom: 8px;
    }
    .card-value {
      font-size: 2rem;
      font-weight: 800;
      color: var(--text);
    }
    .card-sub {
      font-size: 0.75rem;
      color: var(--muted);
      margin-top: 4px;
    }
    .highlight-p95 { color: var(--primary); }
    .highlight-success { color: var(--success); }
    .highlight-warning { color: var(--warning); }
    .highlight-danger { color: var(--danger); }
    .chart-container {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 24px;
    }
    .chart-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 16px;
    }
    footer {
      text-align: center;
      color: var(--muted);
      font-size: 0.8125rem;
      margin-top: 32px;
    }
    a { color: var(--primary); text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <header>
    <div>
      <h1>IAEW 2026 — Telemetria y Observabilidad</h1>
      <p style="color: var(--muted); font-size: 0.875rem;">Monitoreo en vivo de percentiles p95, throughput y transacciones ACID</p>
    </div>
    <div class="status-badge">
      <span class="pulse"></span>
      <span>Prometheus Metrics Activo</span>
    </div>
  </header>

  <div class="grid">
    <div class="card">
      <div class="card-title">Latencia p95 (Histograma)</div>
      <div class="card-value highlight-p95" id="val-p95">-- ms</div>
      <div class="card-sub">Percentil 95 de duracion HTTP</div>
    </div>
    <div class="card">
      <div class="card-title">Tasa de Error (5xx)</div>
      <div class="card-value highlight-danger" id="val-errors">--</div>
      <div class="card-sub" id="val-errors-sub">Errores de servidor sobre el total</div>
    </div>
    <div class="card">
      <div class="card-title">Throughput</div>
      <div class="card-value" id="val-rps">--</div>
      <div class="card-sub">Peticiones por segundo (ultimo intervalo)</div>
    </div>
    <div class="card">
      <div class="card-title">Peticiones Totales</div>
      <div class="card-value" id="val-requests">--</div>
      <div class="card-sub">Acumuladas desde el inicio de la API</div>
    </div>
    <div class="card">
      <div class="card-title">Turnos Confirmados</div>
      <div class="card-value highlight-success" id="val-turnos">--</div>
      <div class="card-sub">Transacciones ACID confirmadas</div>
    </div>
    <div class="card">
      <div class="card-title">Solapamientos Bloqueados</div>
      <div class="card-value highlight-warning" id="val-solapados">--</div>
      <div class="card-sub">Conflictos 409 prevenidos</div>
    </div>
    <div class="card">
      <div class="card-title">Recordatorios Worker</div>
      <div class="card-value highlight-success" id="val-recordatorios">--</div>
      <div class="card-sub">Mensajes RabbitMQ consumidos</div>
    </div>
  </div>

  <div class="chart-container">
    <div class="chart-header">
      <h3>Distribucion de Codigos HTTP y Latencia en Vivo</h3>
      <span style="font-size: 0.8125rem; color: var(--muted);">Actualizado cada 2s &bull; <a href="/metrics" target="_blank">Ver /metrics crudo</a></span>
    </div>
    <div style="height: 280px; position: relative;">
      <canvas id="metricsChart"></canvas>
    </div>
  </div>

  <footer>
    API de Reserva de Turnos de Salud &bull; Metricas Prometheus &bull; Correlation ID propagado &bull; <a href="/docs">Swagger UI (/docs)</a>
  </footer>

  <script>
    const ctx = document.getElementById('metricsChart').getContext('2d');
    const chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [
          {
            label: 'Latencia p95 (ms)',
            borderColor: '#38bdf8',
            backgroundColor: 'rgba(56, 189, 248, 0.1)',
            data: [],
            tension: 0.3,
            fill: true,
            yAxisID: 'y'
          },
          {
            label: 'Peticiones Acumuladas',
            borderColor: '#4ade80',
            backgroundColor: 'transparent',
            data: [],
            borderDash: [5, 5],
            tension: 0.1,
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { grid: { color: '#334155' }, ticks: { color: '#94a3b8' } },
          y: {
            position: 'left',
            grid: { color: '#334155' },
            ticks: { color: '#38bdf8' },
            title: { display: true, text: 'Latencia (ms)', color: '#38bdf8' }
          },
          y1: {
            position: 'right',
            grid: { display: false },
            ticks: { color: '#4ade80' },
            title: { display: true, text: 'Peticiones', color: '#4ade80' }
          }
        },
        plugins: {
          legend: { labels: { color: '#f8fafc' } }
        }
      }
    });

    let previousTotal = null;
    let previousTime = null;

    async function updateDashboard() {
      try {
        const res = await fetch('/api/v1/metrics-summary');
        if (!res.ok) return;
        const data = await res.json();

        const nowMs = Date.now();
        if (previousTotal !== null) {
          const seconds = (nowMs - previousTime) / 1000;
          const rps = seconds > 0 ? (data.totalRequests - previousTotal) / seconds : 0;
          document.getElementById('val-rps').innerText = rps.toFixed(2) + ' req/s';
        }
        previousTotal = data.totalRequests;
        previousTime = nowMs;

        document.getElementById('val-p95').innerText = (data.p95Ms || 0).toFixed(1) + ' ms';
        document.getElementById('val-requests').innerText = data.totalRequests || 0;
        document.getElementById('val-errors').innerText = ((data.errorRate || 0) * 100).toFixed(1) + ' %';
        document.getElementById('val-errors-sub').innerText = (data.serverErrors || 0) + ' errores 5xx, ' + (data.clientErrors || 0) + ' rechazos 4xx de negocio';
        document.getElementById('val-turnos').innerText = data.turnosReservados || 0;
        document.getElementById('val-solapados').innerText = data.turnosSolapados || 0;
        document.getElementById('val-recordatorios').innerText = data.recordatoriosProcesados || 0;

        const now = new Date().toLocaleTimeString();
        chart.data.labels.push(now);
        chart.data.datasets[0].data.push(data.p95Ms || 0);
        chart.data.datasets[1].data.push(data.totalRequests || 0);

        if (chart.data.labels.length > 15) {
          chart.data.labels.shift();
          chart.data.datasets[0].data.shift();
          chart.data.datasets[1].data.shift();
        }
        chart.update();
      } catch (err) {
      }
    }

    setInterval(updateDashboard, 2000);
    updateDashboard();
  </script>
</body>
</html>`;
}

module.exports = { getDashboardHtml };

