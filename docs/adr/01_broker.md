# ADR-001: Message Broker para eventos asincrónicos

**Estado:** Aceptado

**Contexto:**
El dominio del sistema requiere emitir el evento de negocio `turno.reservado` para disparar el procesamiento asincrónico de recordatorios y notificaciones al paciente (vía email/SMS), sin demorar ni bloquear la respuesta HTTP de confirmación de reserva al usuario final. Se requiere un desacople temporal confiable con soporte de persistencia de mensajes y reintentos ante caídas transitorias.

**Decisión:**
Adoptar **RabbitMQ** como message broker central con topología basada en exchanges `direct`, colas durables, confirmaciones de publicación (*publisher confirms*) y aislamiento de fallas:
- **Exchange principal:** `turnos.exchange` (tipo `direct`, durable).
- **Routing Key principal:** `turno.reservado`.
- **Cola principal de consumo:** `notificaciones.turno-reservado` (durable, procesada por el worker de fondo).
- **Exchange de reintentos:** `turnos.retry.exchange` (tipo `direct`, durable).
- **Cola de reintentos diferidos:** `notificaciones.turno-reservado.retry` configurada con `x-message-ttl` (por defecto 3000 ms) y `x-dead-letter-exchange: turnos.exchange` para reenrutamiento automático sin bloquear la cola principal.
- **Dead Letter Exchange (DLX):** `turnos.dlx` (tipo `direct`, durable).
- **Dead Letter Queue (DLQ):** `notificaciones.turno-reservado.dlq` (routing key `turno.reservado.dlq`) para aislar mensajes con errores permanentes o tras agotar el límite de reintentos (3 intentos).
- **Publicación confiable:** La API publica los eventos utilizando confirm channels (`createConfirmChannel()`), esperando la confirmación del broker (`waitForConfirms()`) y marcando los mensajes con entrega persistente (`persistent: true`).

**Alternativas consideradas:**
- **Redis Pub/Sub:** Descartado. No persiste mensajes en disco de forma transaccional; si el worker de recordatorios está detenido o en mantenimiento, los eventos publicados durante ese lapso se pierden irremediablemente, lo cual es inaceptable para notificaciones de salud.
- **Apache Kafka:** Descartado. Presenta una sobrecarga operativa y de configuración desproporcionada para el volumen de turnos de un centro de salud individual.

**Consecuencias:**
- Se desacopla temporalmente la confirmación de la reserva (tiempo de respuesta HTTP < 40 ms) del envío de notificaciones y recordatorios.
- Si el worker de notificaciones se detiene o se reinicia, RabbitMQ retiene los mensajes en estado `Ready` sin pérdida de datos, reanudando el consumo apenas el worker vuelve a estar activo.
- Soporta trazabilidad distribuida propagando el header `x-correlation-id` en las propiedades del mensaje AMQP.
- Requiere orquestar el contenedor de RabbitMQ (`iaew-turnos-rabbitmq`) en `docker-compose.yml` con healthcheck en el puerto AMQP 5672 y panel de administración en el puerto 15672.
