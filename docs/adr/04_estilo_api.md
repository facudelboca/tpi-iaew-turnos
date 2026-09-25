
## ADR-004: Estilo de API

**Estado:** Aceptado

**Contexto:**
Se necesita CRUD de pacientes/turnos/profesionales, un flujo transaccional de reserva (validar, bloquear,confirmar) y disponibilidad en tiempo real de la agenda.

**Decisión:**
**REST** para el CRUD y el flujo de reserva, complementado con **WebSocket** de solo lectura para la vista de agenda en vivo.

**Alternativas consideradas:**
- **GraphQL:** descartado — las entidades y operaciones son fijas y predecibles, no hay un problema real de over-fetching que lo justifique. REST mapea los scopes directamente a verbos + recursos de forma más directa (`POST /turnos` → `write:turnos`, `DELETE /turnos/:id` → `cancel:turnos`).

**Consecuencias:**
- El flujo de reserva se modela como un único endpoint transaccional `POST /turnos`, que internamente ejecuta validar+bloquear+confirmar dentro de una misma transacción de Mongoose (ver ADR-002), evitando exponer los tres pasos como endpoints separados y así prevenir condiciones de carrera.
- El canal WebSocket es de solo lectura, alimentado por el mismo evento `turno.reservado` publicado en RabbitMQ (ver ADR-001), y no reemplaza a REST.
- Endpoints sugeridos:
  - `GET /turnos` — `read:turnos`
  - `POST /turnos` — `write:turnos`
  - `DELETE /turnos/:id` — `cancel:turnos`
  - `POST /profesionales`, `PUT /profesionales/:id` — `admin:profesionales`