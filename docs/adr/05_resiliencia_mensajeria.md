# ADR-005: Matriz de Resiliencia y Mensajería Asincrónica

**Estado:** Aceptado

**Contexto:**
El sistema desacopla la reserva de turnos de la notificación y recordatorios al paciente mediante eventos asincrónicos en RabbitMQ. Se define la estrategia integral de entrega, consistencia y tolerancia a fallos ante caídas de red o fallas transitorias de servicios externos.

## Matriz de Resiliencia y Mensajería

| Campo | Decisión y Enfoque Funcional |
| :--- | :--- |
| **Operación Principal** | **Notificación de Reserva de Turno (`turno.reservado`):** Proceso asíncrono para enviar la confirmación/recordatorio al paciente o notificar a sistemas externos. Es una tarea secundaria que no debe bloquear ni demorar la respuesta de la reserva en vivo. |
| **Garantía de Entrega y Deduplicación** | **Identificador Único de Evento (`eventId`):** Cada evento de reserva viaja con un ID único e irrepetible. Antes de procesar la notificación, el sistema registra este ID en la base de datos (`EventoProcesado`). Si RabbitMQ reentrega el mismo mensaje por un microcorte de red, el sistema reconoce el duplicado y lo descarta sin duplicar notificaciones. |
| **Estrategia ante Fallas Transitorias** | **Manejo Gradual de Reintentos (Retry Queue):** Si el envío de la notificación falla por un problema temporal (servidor externo caído, corte de red, timeout), el error se clasifica como transitorio. El mensaje no se pierde: se reenvía a una cola de reintento que espera un tiempo prudencial antes de volver a intentarlo, usando un contador en sus encabezados. |
| **Límite de Fallas y Descarte Seguro** | **Aislamiento en DLQ (Dead Letter Queue):** Para evitar bucles infinitos que saturen los servidores, el sistema permite un máximo de reintentos (ej. 3 intentos). Si la falla persiste o ocurre un error grave no recuperable, el mensaje se envía a la cola de mensajes descartados (DLQ) para que el equipo de soporte pueda revisarlo sin afectar la operación normal. |
| **Consistencia y Experiencia de Usuario** | **Consistencia Eventual Tolerable:** La reserva del turno queda confirmada de forma inmediata en la base de datos para asegurar el lugar del paciente. La notificación o integración externa se completa unos segundos después de forma asíncrona. Si ocurre una falla extrema, un proceso secundario detecta los turnos no notificados para corregirlos. |

**Consecuencias:**
- La API responde inmediatamente al cliente tras confirmar en base de datos.
- El procesamiento de notificaciones tolera caídas temporales del receptor sin pérdida de datos.
- Los reintentos controlados y la DLQ evitan que mensajes fallidos bloqueen el procesamiento de la cola principal.
