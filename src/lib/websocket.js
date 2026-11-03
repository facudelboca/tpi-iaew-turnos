const { WebSocketServer, WebSocket } = require('ws');

let wss = null;
const clients = new Set();

function initWebSocket(server) {
  wss = new WebSocketServer({ server, path: '/ws/agenda' });

  wss.on('connection', (ws) => {
    clients.add(ws);

    ws.send(JSON.stringify({
      tipo: 'CONEXION_ESTABLECIDA',
      mensaje: 'Conectado a la agenda medica en tiempo real',
      timestamp: new Date().toISOString()
    }));

    ws.on('message', (message) => {
      try {
        const parsed = JSON.parse(message.toString());
        if (parsed.accion === 'PING') {
          ws.send(JSON.stringify({
            tipo: 'PONG',
            timestamp: new Date().toISOString()
          }));
        }
      } catch (err) {
      }
    });

    ws.on('close', () => {
      clients.delete(ws);
    });

    ws.on('error', () => {
      clients.delete(ws);
    });
  });

  return wss;
}

function broadcastAgendaEvent(tipo, data) {
  const payload = JSON.stringify({
    tipo,
    data,
    timestamp: new Date().toISOString()
  });

  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  }
}

function getConnectedClientsCount() {
  return clients.size;
}

function closeWebSocket() {
  if (wss) {
    for (const client of clients) {
      client.terminate();
    }
    clients.clear();
    wss.close();
    wss = null;
  }
}

module.exports = {
  initWebSocket,
  broadcastAgendaEvent,
  getConnectedClientsCount,
  closeWebSocket
};

