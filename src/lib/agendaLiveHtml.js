function getAgendaLiveHtml() {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Monitor de Agenda en Tiempo Real — IAEW Salud</title>
  <style>
    :root {
      --bg: #0b1120;
      --card-bg: #1e293b;
      --border: #334155;
      --text: #f8fafc;
      --muted: #94a3b8;
      --primary: #38bdf8;
      --success: #10b981;
      --danger: #ef4444;
      --warning: #f59e0b;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }
    header {
      background: #0f172a;
      border-bottom: 1px solid var(--border);
      padding: 16px 28px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .brand-icon {
      width: 38px;
      height: 38px;
      background: linear-gradient(135deg, #0ea5e9, #38bdf8);
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 20px;
      color: #fff;
    }
    .brand-text h1 {
      font-size: 1.15rem;
      font-weight: 700;
      color: #fff;
    }
    .brand-text p {
      font-size: 0.75rem;
      color: var(--muted);
    }
    .header-actions {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .status-pill {
      display: flex;
      align-items: center;
      gap: 8px;
      background: rgba(16, 185, 129, 0.12);
      border: 1px solid rgba(16, 185, 129, 0.4);
      color: var(--success);
      padding: 6px 14px;
      border-radius: 9999px;
      font-size: 0.8rem;
      font-weight: 600;
      transition: all 0.3s ease;
    }
    .status-pill.disconnected {
      background: rgba(239, 68, 68, 0.12);
      border-color: rgba(239, 68, 68, 0.4);
      color: var(--danger);
    }
    .pulse-dot {
      width: 8px;
      height: 8px;
      background: var(--success);
      border-radius: 50%;
      box-shadow: 0 0 8px var(--success);
      animation: pulse 1.8s infinite;
    }
    .status-pill.disconnected .pulse-dot {
      background: var(--danger);
      box-shadow: 0 0 8px var(--danger);
      animation: none;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(0.85); }
    }
    .nav-btn {
      color: var(--muted);
      text-decoration: none;
      font-size: 0.825rem;
      font-weight: 500;
      padding: 6px 12px;
      border-radius: 6px;
      border: 1px solid var(--border);
      background: #1e293b;
      transition: all 0.2s;
    }
    .nav-btn:hover {
      color: #fff;
      border-color: var(--primary);
    }
    main {
      flex: 1;
      max-width: 1100px;
      width: 100%;
      margin: 0 auto;
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .stats-bar {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
    }
    .stat-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 16px 20px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .stat-card .label {
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--muted);
      font-weight: 600;
    }
    .stat-card .value {
      font-size: 1.75rem;
      font-weight: 800;
    }
    .feed-container {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 20px;
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .feed-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid var(--border);
      padding-bottom: 12px;
    }
    .feed-header h2 {
      font-size: 1rem;
      font-weight: 700;
      color: #fff;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .feed-actions {
      display: flex;
      gap: 10px;
    }
    .btn {
      background: #334155;
      color: var(--text);
      border: none;
      padding: 6px 14px;
      border-radius: 6px;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    }
    .btn:hover {
      background: #475569;
    }
    .events-stream {
      display: flex;
      flex-direction: column;
      gap: 12px;
      overflow-y: auto;
      max-height: 520px;
      padding-right: 4px;
    }
    .event-card {
      background: #0f172a;
      border: 1px solid var(--border);
      border-left: 5px solid #64748b;
      border-radius: 10px;
      padding: 14px 18px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      animation: slideIn 0.35s ease-out;
    }
    .event-card.reservado {
      border-left-color: var(--success);
      background: rgba(16, 185, 129, 0.04);
    }
    .event-card.cancelado {
      border-left-color: var(--danger);
      background: rgba(239, 68, 68, 0.04);
    }
    .event-card.conexion {
      border-left-color: var(--primary);
    }
    @keyframes slideIn {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .event-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.825rem;
    }
    .badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 0.725rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .badge-reservado { background: rgba(16, 185, 129, 0.2); color: #34d399; }
    .badge-cancelado { background: rgba(239, 68, 68, 0.2); color: #f87171; }
    .badge-conexion { background: rgba(56, 189, 248, 0.2); color: #38bdf8; }
    .event-time {
      color: var(--muted);
      font-size: 0.75rem;
    }
    .event-details {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 8px;
      font-size: 0.85rem;
    }
    .detail-item {
      display: flex;
      flex-direction: column;
    }
    .detail-label {
      font-size: 0.7rem;
      color: var(--muted);
      text-transform: uppercase;
    }
    .detail-val {
      font-weight: 600;
      color: #fff;
    }
    .empty-state {
      text-align: center;
      color: var(--muted);
      padding: 40px 20px;
      font-size: 0.9rem;
    }
  </style>
</head>
<body>
  <header>
    <div class="brand">
      <div class="brand-icon">⚕</div>
      <div class="brand-text">
        <h1>IAEW Salud — Monitor de Agenda Médica</h1>
        <p>Integración en Tiempo Real vía WebSocket (ws://localhost:3000/ws/agenda)</p>
      </div>
    </div>
    <div class="header-actions">
      <div id="statusPill" class="status-pill disconnected">
        <span class="pulse-dot"></span>
        <span id="statusText">Conectando...</span>
      </div>
      <a href="/dashboard" class="nav-btn">📊 Dashboard</a>
      <a href="/docs" class="nav-btn">📖 Swagger</a>
    </div>
  </header>

  <main>
    <div class="stats-bar">
      <div class="stat-card">
        <span class="label">Eventos en Vivo</span>
        <span id="totalEvents" class="value" style="color: var(--primary);">0</span>
      </div>
      <div class="stat-card">
        <span class="label">Turnos Confirmados</span>
        <span id="totalReservas" class="value" style="color: var(--success);">0</span>
      </div>
      <div class="stat-card">
        <span class="label">Turnos Cancelados</span>
        <span id="totalCancelaciones" class="value" style="color: var(--danger);">0</span>
      </div>
    </div>

    <div class="feed-container">
      <div class="feed-header">
        <h2><span>⚡</span> Flujo de Eventos Push (WebSocket Stream)</h2>
        <div class="feed-actions">
          <button class="btn" onclick="clearStream()">Limpiar</button>
        </div>
      </div>
      <div id="eventsStream" class="events-stream">
        <div id="emptyMsg" class="empty-state">
          Esperando eventos de agenda en tiempo real desde la API REST...
        </div>
      </div>
    </div>
  </main>

  <script>
    let eventCount = 0;
    let reservaCount = 0;
    let cancelCount = 0;

    const stream = document.getElementById('eventsStream');
    const emptyMsg = document.getElementById('emptyMsg');
    const statusPill = document.getElementById('statusPill');
    const statusText = document.getElementById('statusText');
    const totalEventsEl = document.getElementById('totalEvents');
    const totalReservasEl = document.getElementById('totalReservas');
    const totalCancelacionesEl = document.getElementById('totalCancelaciones');

    function connectWs() {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = protocol + '//' + window.location.host + '/ws/agenda';
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        statusPill.classList.remove('disconnected');
        statusText.textContent = 'En Vivo (WebSocket Activo)';
      };

      ws.onclose = () => {
        statusPill.classList.add('disconnected');
        statusText.textContent = 'Desconectado (Reintentando...)';
        setTimeout(connectWs, 2000);
      };

      ws.onerror = () => {
        ws.close();
      };

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          handleEvent(msg);
        } catch (err) {
          console.error('Error parseando evento:', err);
        }
      };
    }

    function handleEvent(msg) {
      if (emptyMsg) emptyMsg.style.display = 'none';

      eventCount++;
      totalEventsEl.textContent = eventCount;

      const card = document.createElement('div');
      const timeStr = new Date().toLocaleTimeString();

      if (msg.tipo === 'TURNO_RESERVADO') {
        reservaCount++;
        totalReservasEl.textContent = reservaCount;
        card.className = 'event-card reservado';
        const d = msg.data || {};
        card.innerHTML = \`
          <div class="event-header">
            <span class="badge badge-reservado">✓ Turno Reservado #\${d.turnoId || ''}</span>
            <span class="event-time">\${timeStr}</span>
          </div>
          <div class="event-details">
            <div class="detail-item">
              <span class="detail-label">Paciente</span>
              <span class="detail-val">\${d.paciente || ('ID: ' + d.pacienteId)}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Profesional</span>
              <span class="detail-val">\${d.profesional || ('ID: ' + d.profesionalId)} (\${d.especialidad || 'Especialidad'})</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Horario</span>
              <span class="detail-val">\${d.fechaHoraInicio ? new Date(d.fechaHoraInicio).toLocaleString() : 'N/A'}</span>
            </div>
          </div>
        \`;
      } else if (msg.tipo === 'TURNO_CANCELADO') {
        cancelCount++;
        totalCancelacionesEl.textContent = cancelCount;
        card.className = 'event-card cancelado';
        const d = msg.data || {};
        card.innerHTML = \`
          <div class="event-header">
            <span class="badge badge-cancelado">✕ Turno Cancelado #\${d.turnoId || ''}</span>
            <span class="event-time">\${timeStr}</span>
          </div>
          <div class="event-details">
            <div class="detail-item">
              <span class="detail-label">Estado</span>
              <span class="detail-val" style="color: var(--danger);">CANCELADO</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Motivo</span>
              <span class="detail-val">\${d.motivoCancelacion || 'Cancelado por solicitud del paciente'}</span>
            </div>
          </div>
        \`;
      } else {
        card.className = 'event-card conexion';
        card.innerHTML = \`
          <div class="event-header">
            <span class="badge badge-conexion">ℹ \${msg.tipo || 'SISTEMA'}</span>
            <span class="event-time">\${timeStr}</span>
          </div>
          <div style="font-size: 0.85rem; color: #fff;">\${msg.mensaje || JSON.stringify(msg)}</div>
        \`;
      }

      stream.insertBefore(card, stream.firstChild);
    }

    function clearStream() {
      stream.innerHTML = '<div id="emptyMsg" class="empty-state">Esperando nuevos eventos...</div>';
      eventCount = 0;
      reservaCount = 0;
      cancelCount = 0;
      totalEventsEl.textContent = '0';
      totalReservasEl.textContent = '0';
      totalCancelacionesEl.textContent = '0';
    }

    connectWs();
  </script>
</body>
</html>`;
}

module.exports = { getAgendaLiveHtml };
