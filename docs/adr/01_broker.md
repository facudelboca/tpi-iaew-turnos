
## ADR-001: Message Broker para eventos asincrónicos

**Estado:** Aceptado

**Contexto:**
El dominio requiere emitir el evento `turno.reservado` para disparar recordatorios diferidos y notificaciones (webhook de confirmación/cancelación), sin bloquear la respuesta de la reserva al usuario final.

**Decisión:**
Usar **RabbitMQ** con un exchange tipo `topic` (`turnos.events`) y colas dedicadas: `recordatorios.queue` y `notificaciones.queue`.

**Alternativas consideradas:**
- **Redis Pub/Sub:** descartado — no persiste mensajes; si el consumer de recordatorios está caído, el evento se pierde, lo cual es inaceptable para un recordatorio crítico.

**Consecuencias:**
- Se suma un contenedor RabbitMQ al docker-compose.
- Se logra desacople real entre "reservar turno" y "avisar al paciente".
- RabbitMQ ofrece colas durables + DLQ, útil para reintentos si falla el envío de un recordatorio.
