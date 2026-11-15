# ADR-005: Matriz de Resiliencia, Reintentos y Mensajería Asincrónica

**Estado:** Aceptado

**Contexto:**
El sistema desacopla la reserva de turnos de la notificación y recordatorios al paciente mediante eventos asincrónicos en RabbitMQ. Se debe definir la estrategia integral de entrega confiable, consistencia eventual y tolerancia a fallos ante caídas transitorias de red o indisponibilidad de proveedores externos de mensajería (SMS/Email), evitando tanto la pérdida de mensajes como el procesamiento repetido (*at-least-once*).

## Matriz de Resiliencia y Mensajería

| Dimensión | Decisión y Enfoque Funcional | Implementación en Código |
| :--- | :--- | :--- |
| **Operación Principal** | **Notificación de Reserva de Turno (`turno.reservado`):** Proceso asíncrono para enviar confirmación/recordatorio al paciente. Tarea secundaria que no bloquea la respuesta HTTP de la reserva (< 40 ms). | Publicado por `publicarTurnoReservado()` en `src/lib/rabbit.js` tras el commit transaccional de PostgreSQL. |
| **Garantía de Entrega y Deduplicación** | **Identificador Único de Evento (`eventId`):** Cada evento viaja con un UUID v4 inmutable. Antes de procesar el recordatorio, el worker valida y registra el `eventId` en la tabla `eventos_procesados` (`UNIQUE`). Si RabbitMQ reentrega el mensaje por un corte de red, el sistema detecta el duplicado y lo descarta sin duplicar recordatorios. | `EventoProcesado.findOne()` y manejo de `SequelizeUniqueConstraintError` en `src/worker.js`. |
| **Estrategia ante Fallas Transitorias** | **Cola de Reintento Diferido con TTL (Retry Queue):** Si la notificación falla por un error temporal (corte de conexión, timeout), el error se clasifica como transitorio. El mensaje se deriva al exchange `turnos.retry.exchange` hacia la cola `notificaciones.turno-reservado.retry` con TTL diferido (3000 ms). Vencido el TTL, RabbitMQ lo devuelve automáticamente a la cola principal vía Dead Letter Exchange. | Topología configurada en `crearCanal()` (`x-message-ttl`, `x-dead-letter-exchange`) y `publishRetry()` en `src/lib/rabbit.js`. |
| **Clasificación de Errores** | **Diferenciación entre Errores Transitorios y Permanentes:**<br>- **Permanente:** Payload inválido o turno inexistente. No tiene sentido reintentar; se envía directo a DLQ.<br>- **Transitorio:** Caídas temporales de red o base de datos. Se reintenta hasta el límite configurado. | Clases `TransientMessageError` y `PermanentMessageError` en `src/worker.js`. |
| **Límite de Reintentos y Aislamiento** | **Dead Letter Queue (DLQ):** Para evitar bucles infinitos de reintentos, el sistema permite un máximo configurable (`MAX_RETRIES = 3`). Si la falla persiste tras 3 intentos, el mensaje se publica en `turnos.dlx` hacia la cola `notificaciones.turno-reservado.dlq` con metadatos del motivo de descarte (`x-dlq-reason`). | Función `publishDlq()` en `src/lib/rabbit.js` y consumo controlado en `src/worker.js`. |
| **Confirmación de Consumo** | **Acknowledge Explícito (`noAck: false`):** El worker no confirma el mensaje a RabbitMQ hasta que la notificación fue persistida exitosamente o delegada de forma segura a la cola de reintento o DLQ. Si el worker colapsa durante el procesamiento, RabbitMQ reentrega el mensaje a otra instancia. | `channel.ack(message)` ejecutado exclusivamente al finalizar cada rama controlada en `src/worker.js`. |
| **Consistencia y Auditoría** | **Consistencia Eventual:** La reserva se confirma de inmediato en base de datos (`estado = CONFIRMADO`). El worker actualiza de forma eventual los campos `recordatorioEnviado = true` y `fechaRecordatorio = NOW()` en la tabla `turnos`. | Transacción de actualización en `src/worker.js` vinculada al `turnoId` del evento. |

**Consecuencias:**
- La API responde inmediatamente al cliente tras persistir en base de datos.
- Las caídas temporales de servicios externos o reinicios del worker no provocan pérdida de notificaciones.
- Los reintentos diferidos y la DLQ garantizan que los mensajes defectuosos no bloqueen la cola principal (*poison messages*).
- Los operadores pueden inspeccionar la cola DLQ en el panel de administración de RabbitMQ (`http://localhost:15672`) para analizar y reprocesar anomalías.
