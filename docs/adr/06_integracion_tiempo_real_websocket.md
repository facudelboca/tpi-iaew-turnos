# ADR-006: Integración en Tiempo Real con WebSocket para Agenda Médica en Vivo

**Estado:** Aceptado

**Contexto:**
El sistema de turnos de salud requiere notificar los cambios de estado en la agenda médica de forma inmediata a los clientes conectados (como paneles de recepción hospitalaria o pantallas de sala de espera). Se evaluaron alternativas de integración adicional según la consigna de la cátedra:
1. **Webhooks salientes:** Requiere que los receptores expongan un endpoint HTTP público, gestionando reintentos y firmas HMAC. Inadecuado para clientes de navegador o interfaces de recepción.
2. **gRPC:** Requiere soporte de HTTP/2 completo y compilación de archivos ProtoBuf, con compatibilidad limitada para navegadores sin proxy intermediario (gRPC-Web).
3. **WebSocket (ws://):** Establece una conexión bidireccional full-duplex de baja latencia mediante el protocolo estándar RFC 6455, ideal para actualizaciones en tiempo real sin polling.

## Decisión de Arquitectura

Se adopta **WebSocket sobre la ruta `/ws/agenda`** utilizando la librería nativa `ws` integrada sobre el servidor HTTP de Express:

1. **Compartición de Puerto:**
   El servidor HTTP de Node.js administra tanto las peticiones REST (`/api/v1`) como las solicitudes de actualización de protocolo (`Upgrade: websocket`) en el mismo puerto 3000.
2. **Ciclo de Vida de Conexiones:**
   El servidor almacena las conexiones activas en memoria (`Set`) y administra eventos de desconexión y errores de manera transparente.
3. **Heartbeat y Diagnóstico:**
   Soporte para mensajes interactivos de verificación mediante mensajes `{ "accion": "PING" }` respondiendo `{ "tipo": "PONG" }`.
4. **Despacho Desacoplado de Eventos:**
   La capa de servicios (`turnoService.js`), al persistir una reserva o una cancelación en la base de datos, ejecuta `broadcastAgendaEvent(tipo, data)` sin bloquear la respuesta HTTP ni acoplarse a los clientes conectados:
   - Evento `TURNO_RESERVADO`: emitido cuando un turno pasa a estado `CONFIRMADO`.
   - Evento `TURNO_CANCELADO`: emitido cuando un turno pasa a estado `CANCELADO`.
5. **Panel Visual de Recepción (`/agenda-live`):**
   Para verificar y presentar la integración en tiempo real sin requerir consolas de depuración, la API sirve una interfaz web visual autónoma en `GET /agenda-live`. Esta pantalla se conecta automáticamente a `ws://localhost:3000/ws/agenda`, mostrando el pulso de conexión en vivo, contadores acumulados de eventos y tarjetas animadas con los detalles del turno y profesional.

## Consecuencias

- **Positivas:**
  - Actualización instantánea en paneles de recepción clínica sin tráfico redundante de sondeo (*polling*).
  - Arquitectura desacoplada: si no hay clientes conectados, el broadcast no consume recursos ni falla la operación REST.
  - Cero dependencias pesadas en el cliente, compatible con cualquier navegador web moderno o terminal.
- **A considerar en producción:**
  - En un esquema con múltiples réplicas detrás de un balanceador de carga, se requeriría un adapter de pub/sub distribuido (por ejemplo, Redis Pub/Sub o RabbitMQ exchange tipo fanout) para sincronizar las conexiones entre diferentes instancias del servidor.
