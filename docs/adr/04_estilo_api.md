# ADR-004: Estilo de API, Versionado, Idempotencia y Trazabilidad

**Estado:** Aceptado

**Contexto:**
El sistema debe exponer operaciones CRUD y flujos transaccionales de reserva médica a múltiples clientes (aplicaciones web, sistemas de recepción clínica y herramientas de integración). Se requiere definir el estilo arquitectónico de comunicación, la estrategia de versionado de endpoints, el manejo de cancelaciones bajo cumplimiento normativo de salud, la prevención de operaciones duplicadas por cortes de red y la observabilidad de extremo a extremo.

**Decisión:**
Adoptar una arquitectura híbrida basada en **RESTful HTTP API** para operaciones transaccionales y de consulta, complementada con un canal **WebSocket** para difusión en tiempo real:

1. **Versionado de Endpoints:**
   Se adopta versionado explícito en la URI mediante el prefijo `/api/v1`:
   - `POST /api/v1/turnos`: Reserva transaccional atómica (`write:turnos`).
   - `GET /api/v1/turnos`: Consulta de turnos y agendas (`read:turnos`).
   - `GET /api/v1/turnos/:id`: Detalle de un turno individual (`read:turnos`).
   - `PATCH /api/v1/turnos/:id/cancelar`: Cancelación de turno (`cancel:turnos`).
   - `GET /api/v1/profesionales`, `GET /api/v1/pacientes`, `GET /api/v1/especialidades`: Catálogos maestros.
   - `POST /api/v1/admin/sync-especialidades`: Endpoint administrativo (`x-api-key`).

2. **Transiciones de Estado vs. Borrado Físico (Auditoría Médica):**
   En el dominio de salud, un turno médico reservado **nunca debe eliminarse físicamente de la base de datos** (`DELETE`) para preservar la trazabilidad del historial clínico y auditoría legal. La cancelación se modela como una transición de estado de negocio mediante el verbo `PATCH` (`PATCH /api/v1/turnos/:id/cancelar`), registrando el motivo de cancelación (`motivoCancelacion`) y actualizando el estado de `CONFIRMADO` a `CANCELADO`.

3. **Mecanismo de Idempotencia en Escrituras Críticas:**
   Para prevenir reservas o cobros duplicados provocados por reintentos de red del cliente, el endpoint `POST /api/v1/turnos` exige el encabezado HTTP:
   ```http
   Idempotency-Key: <clave-unica-del-cliente>
   ```
   - **Primera ejecución:** El sistema crea la reserva en PostgreSQL, guarda la clave de idempotencia y responde `201 Created` con el encabezado `Idempotency-Replayed: false`.
   - **Reenvío idéntico:** Si el cliente reintenta la misma petición con la misma clave, el backend recupera la respuesta persistida sin volver a ejecutar la lógica de reserva ni generar turnos duplicados, respondiendo `200 OK` con el encabezado `Idempotency-Replayed: true`.
   - **Mapeo inconsistente:** Si se reutiliza una clave existente pero con un payload incompatible, se rechaza inmediatamente con `409 Conflict (IDEMPOTENCY_KEY_MISMATCH)`.

4. **Trazabilidad Distribuida (Correlation ID):**
   Todas las peticiones entrantes son interceptadas por el middleware de observabilidad (`observability.js`), que extrae o genera un identificador único en el encabezado `X-Correlation-ID`. Este identificador se propaga en:
   - Los encabezados de respuesta HTTP (`X-Correlation-ID`).
   - El contexto asincrónico de Node.js (`AsyncLocalStorage`).
   - Los logs estructurados JSON de la API.
   - Los encabezados del mensaje AMQP en RabbitMQ (`x-correlation-id`).
   - El procesamiento en el worker de fondo.

5. **Canal en Tiempo Real Complementario:**
   El servidor WebSocket (`/ws/agenda`) emite eventos push (`TURNO_RESERVADO` y `TURNO_CANCELADO`) ante cualquier cambio de estado confirmado en la base de datos, alimentando paneles visuales en vivo (`GET /agenda-live`) sin requerir consultas repetitivas por *polling*.

**Alternativas consideradas:**
- **GraphQL:** Descartado. La estructura de entidades de salud y sus operaciones son conocidas, estables y normalizadas. REST mapea de forma directa y transparente los permisos OAuth2 (scopes) sobre verbos y recursos HTTP.
- **DELETE físico de turnos:** Descartado por violar los principios de auditoría de registros médicos.

**Consecuencias:**
- Contratos de API predecibles, idempotentes y observables.
- Respuestas de error estandarizadas con código tipificado y mensaje descriptivo (`{ "error": { "codigo": "...", "mensaje": "..." } }`).
- Disponibilidad de panel interactivo en tiempo real sin sobrecargar el servidor con peticiones recurrentes.
