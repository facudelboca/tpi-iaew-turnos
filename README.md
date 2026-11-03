# Sistema de Reserva de Turnos de Salud - TPI IAEW 2026

Trabajo Práctico Integrador para la cátedra **Integración de Aplicaciones Empresariales y Web (IAEW 2026)** — UTN-FRC.

---

## 1. Integrantes del Equipo y Dominio de Negocio
- **Dominio:** Dominio 3 — Sistema de Reserva de Turnos de Salud
- **Integrantes:**
  - Facundo Del Boca (Legajo: 89410)

---

## 2. Descripción del Problema de Negocio y Alcance Funcional
El sistema resuelve la gestión integral de turnos médicos en instituciones de salud, garantizando:
- **Prevención de turnos solapados:** Ningún profesional puede tener dos turnos en el mismo horario mediante transacciones ACID con bloqueo pesimista (`SELECT ... FOR UPDATE`).
- **Respeto de agenda médica:** Validación de días y horarios de atención asignados a cada profesional.
- **Idempotencia:** Cabecera `Idempotency-Key` en la reserva para evitar duplicados ante reintentos de red.
- **Asincronía y Resiliencia:** Notificación diferida de recordatorios mediante RabbitMQ, deduplicación de eventos y Dead Letter Queue (DLQ).
- **Actualización en Tiempo Real:** WebSocket para actualización instantánea de agendas sin polling.
- **Trazabilidad:** Correlación transversal con `X-Correlation-ID` en logs JSON estructurados.

---

## 3. Arquitectura en un Vistazo (Diagramas C4)
Documentados en la carpeta [`docs/Diagramas_C4/`](./docs/Diagramas_C4/):
- **[Nivel 1 - Contexto](./docs/Diagramas_C4/01_C4_Contexto.png):** Actores (Paciente, Recepcionista, Admin), Turnos API, Auth0 y RabbitMQ.
- **[Nivel 2 - Contenedores](./docs/Diagramas_C4/02_C4_Contenedores.png):** API REST (Express), Base de Datos (PostgreSQL), Broker (RabbitMQ) y Worker de fondo.
- **[Nivel 3 - Componentes](./docs/Diagramas_C4/03_C4_Componentes.png):** Organización en capas: Rutas -> Middlewares -> Controladores -> Servicios -> Modelos y Libs.

---

## 4. Requisitos Previos de Software
- **Docker Engine** y **Docker Compose** v2+
- **Node.js** v20+ (para ejecución opcional fuera de Docker)

---

## 5. Variables de Entorno (`.env.example`)
Copiar el archivo base: `cp .env.example .env`.

| Variable | Descripción | Ejemplo / Valor |
|---|---|---|
| `PORT` | Puerto de escucha HTTP de la API | `3000` |
| `DATABASE_URL` | Cadena de conexión a PostgreSQL | `postgres://iaew:iaew-local@localhost:5432/iaew_turnos_db` |
| `DB_HOST` / `DB_PORT` | Host y puerto de base de datos | `localhost` / `5432` |
| `DB_NAME` / `DB_USER` / `DB_PASSWORD` | Credenciales de base de datos | `iaew_turnos_db` / `iaew` / `iaew-local` |
| `RABBIT_URL` | URI de conexión al broker RabbitMQ | `amqp://iaew:iaew-local@localhost:5672` |
| `AUTH0_ISSUER_BASE_URL` | Dominio del tenant Auth0 | `https://facundodelboca.us.auth0.com/` |
| `AUTH0_AUDIENCE` | Identificador de la API en Auth0 | `https://iaew-turnos-api` |
| `INTERNAL_API_KEY` | Clave secreta para endpoints administrativos | `iaew-turnos-secret-api-key-2026` |
| `AUTH0_TEST_CLIENT_ID` | Client ID de la app M2M para pruebas | Credencial provista en Auth0 |
| `AUTH0_TEST_CLIENT_SECRET` | Client Secret de la app M2M para pruebas | Credencial provista en Auth0 |

---

## 6. Configuración de Auth0
- **Audience:** `https://iaew-turnos-api`
- **Firma:** `RS256` (verificación pública mediante JWKS).
- **Scopes declarados en la API:**
  - `read:turnos`: Lectura y consulta de turnos.
  - `write:turnos`: Creación y confirmación de reservas.
  - `cancel:turnos`: Cancelación de turnos.
  - `read:pacientes` / `write:pacientes`: Gestión de pacientes.
- **Aplicación M2M:** Autorizada contra la API con los scopes anteriores asignados.

---

## 7. Obtención de Access Token M2M
```bash
curl --request POST \
  --url "https://facundodelboca.us.auth0.com/oauth/token" \
  --header "content-type: application/json" \
  --data '{
    "client_id": "<TU_CLIENT_ID>",
    "client_secret": "<TU_CLIENT_SECRET>",
    "audience": "https://iaew-turnos-api",
    "grant_type": "client_credentials"
  }'
```

---

## 8. Ejemplos de Endpoints Protegidos con Bearer Token

### Reservar Turno con Idempotencia
```bash
curl -X POST http://localhost:3000/api/v1/turnos \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Idempotency-Key: turno-001" \
  -H "Content-Type: application/json" \
  -d '{
    "pacienteId": 1,
    "profesionalId": 1,
    "fechaHoraInicio": "2028-11-20T09:00:00.000Z",
    "fechaHoraFin": "2028-11-20T09:30:00.000Z",
    "motivoConsulta": "Control general",
    "canalNotificacion": "EMAIL"
  }'
```

### Consultar Turnos
```bash
curl -X GET http://localhost:3000/api/v1/turnos \
  -H "Authorization: Bearer <TOKEN>"
```

### Cancelar Turno
```bash
curl -X PATCH http://localhost:3000/api/v1/turnos/1/cancelar \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{ "motivoCancelacion": "Reprogramación solicitada" }'
```

---

## 9. Endpoint Protegido con `x-api-key`
Para tareas de sincronización interna que no requieren tokens de usuario:
```bash
curl -X POST http://localhost:3000/api/v1/admin/sync-especialidades \
  -H "x-api-key: iaew-turnos-secret-api-key-2026"
```
- Sin clave o con clave incorrecta: responde `401 Unauthorized`.
- Con clave válida: responde `200 OK`.

---

## 10. Comandos para Levantar y Detener el Entorno

Levantar entorno completo:
```bash
docker compose up -d --build
```

Detener y remover volúmenes:
```bash
docker compose down -v
```

---

## 11. Carga de Datos Iniciales (Seed)
Puebla especialidades, profesionales con agendas, pacientes y turnos base:
```bash
npm run seed
# o mediante docker:
docker compose exec api npm run seed
```

---

## 12. Pruebas Automatizadas
- **Suite Postman / Newman:**
  ```bash
  npm run test:postman
  ```
  Ejecuta la colección [`docs/postman/Turnos_Salud_IAEW.postman_collection.json`](./docs/postman/Turnos_Salud_IAEW.postman_collection.json) con 14 peticiones y 29 aserciones automáticas.
- **Prueba de Carga y Concurrencia Extrema:**
  ```bash
  npm run test:load
  ```
  Dispara 30 peticiones concurrentes por el mismo turno médico, verificando que exactamente 1 resulta confirmada (201) y 29 rechazadas por conflicto (409 `TURNO_OCUPADO`). Genera el reporte interactivo en [`docs/pruebas/reporte-carga.html`](./docs/pruebas/reporte-carga.html).

---

## 13. Flujo Asincrónico y Evidencias
1. La API publica el evento `turno.reservado` en el exchange `turnos.exchange`.
2. El mensaje ingresa a la cola `notificaciones.turno-reservado`.
3. El worker (`src/worker.js`) consume el mensaje, deduplica contra la tabla `eventos_procesados` y marca `recordatorio_enviado: true` en PostgreSQL.
4. En caso de fallas transitorias, reintenta hasta 3 veces antes de desviar el mensaje a `turnos.dlq`.
- Panel de RabbitMQ: `http://localhost:15672` (`iaew` / `iaew-local`).

---

## 14. Integración en Tiempo Real (WebSocket)
- Canal: `ws://localhost:3000/ws/agenda`
- Al crearse o cancelarse un turno, el servidor transmite el evento en vivo a los clientes conectados sin requerir polling.
- Prueba automatizada: `npm run test:ws`.

---

## 15. Observabilidad y Métricas
- **Logs JSON:** Salida estándar con formato `{ timestamp, level, service, correlationId, http, ... }`.
- **Correlation ID:** Cabecera `X-Correlation-ID` propagada de extremo a extremo (HTTP -> AMQP -> Worker).
- **Métricas Prometheus:** `GET http://localhost:3000/metrics`.
- **Dashboard Visual:** `http://localhost:3000/dashboard` muestra en tiempo real latencia p95, throughput y tasa de error.

---

## 16. Endpoints Principales y Documentación OpenAPI
- **Swagger UI:** `http://localhost:3000/docs`
- **OpenAPI JSON:** `http://localhost:3000/openapi.json`

| Método | Ruta | Seguridad | Descripción |
|---|---|---|---|
| `GET` | `/health` | Público | Healthcheck del servicio |
| `GET` | `/metrics` | Público | Métricas en formato Prometheus |
| `GET` | `/dashboard` | Público | Dashboard visual de telemetría |
| `GET` | `/docs` | Público | Documentación interactiva Swagger |
| `GET` | `/api/v1/profesionales` | Público | Lista de médicos y sus días de atención |
| `POST` | `/api/v1/pacientes` | Público | Creación de paciente |
| `POST` | `/api/v1/turnos` | Bearer (`write:turnos`) | Reserva de turno con Idempotency-Key |
| `GET` | `/api/v1/turnos` | Bearer (`read:turnos`) | Consulta de turnos |
| `PATCH` | `/api/v1/turnos/:id/cancelar` | Bearer (`cancel:turnos`) | Cancelación de turno |
| `POST` | `/api/v1/admin/sync-especialidades` | `x-api-key` | Sincronización administrativa |

---

## 17. Decisiones Técnicas (ADRs), Limitaciones y Mejoras Futuras
- **ADRs en [`docs/adr/`](./docs/adr/):**
  - `01_broker.md`: RabbitMQ para desacople asincrónico.
  - `02_bd.md`: PostgreSQL con bloqueo pesimista `SELECT ... FOR UPDATE` para prevención de solapamientos.
  - `03_seguridad.md`: Auth0 con scopes granulares y API Key administrativa.
  - `04_estilo_api.md`: REST transaccional y WebSockets para tiempo real.
  - `05_resiliencia_mensajeria.md`: Idempotencia, deduplicación y Dead Letter Queue (DLQ).
  - `06_integracion_tiempo_real_websocket.md`: Servidor WebSocket nativo desacoplado.
- **Limitaciones Conocidas:** Despliegue actual configurado en nodo único para PostgreSQL y RabbitMQ; recordatorios simulados internamente sin proveedor comercial SMS/WhatsApp de pago.
- **Mejoras Futuras:** Implementación del patrón Transactional Outbox para entrega exactly-once ante caídas del broker.
