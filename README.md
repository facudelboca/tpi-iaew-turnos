# TPI IAEW 2026 - Reserva de Turnos de Salud

## Dominio 3: Reserva de Turnos de Salud
Este repositorio contiene la base inicial correspondiente al **Modelo de Datos**, **Contrato OpenAPI**, **ADRs de Arquitectura** y el **Esqueleto de Ejecución** para el sistema de reserva de turnos médicos de salud.

---

## 1. Modelo de Datos (Relacional / PostgreSQL)

El modelo de datos se implementa en **PostgreSQL 16+** con **Sequelize ORM** y script DDL de migraciones (`src/migrations/init.sql`), estructurado en las siguientes tablas:

- **`pacientes` (`src/models/Paciente.js`):**
  - Campos: `id` (PK), `nombre`, `apellido`, `dni` (UNIQUE), `email`, `telefono`, `obra_social`, `numero_afiliado`, `activo`, `created_at`, `updated_at`.
- **`especialidades` (`src/models/Especialidad.js`):**
  - Campos: `id` (PK), `nombre` (UNIQUE), `descripcion`, `duracion_minutos_turno` (por defecto 30 min), `activo`, `created_at`, `updated_at`.
- **`profesionales` (`src/models/Profesional.js`):**
  - Campos: `id` (PK), `nombre`, `apellido`, `matricula` (UNIQUE), `especialidad_id` (FK a `especialidades`), `email`, `telefono`, `activo`, `created_at`, `updated_at`.
- **`profesional_dias_atencion` (`src/models/ProfesionalDiaAtencion.js`):**
  - Campos: `id` (PK), `profesional_id` (FK), `dia` (`LUNES` a `DOMINGO`), `hora_inicio`, `hora_fin`.
- **`turnos` (`src/models/Turno.js`):**
  - Campos: `id` (PK), `paciente_id` (FK), `profesional_id` (FK), `especialidad_id` (FK), `fecha_hora_inicio`, `fecha_hora_fin`, `motivo_consulta`, `estado` (`PENDIENTE`, `CONFIRMADO`, `CANCELADO`, `COMPLETADO`), `canal_notificacion` (`EMAIL`, `WHATSAPP`, `SMS`), `recordatorio_enviado`, `fecha_recordatorio`, `motivo_cancelacion`, `created_at`, `updated_at`.
  - Índices compuestos: `(profesional_id, fecha_hora_inicio, estado)` y `(paciente_id, fecha_hora_inicio)` para control de solapamiento y consultas de agenda médica.

---

## 2. Estrategia de Migraciones y Seed (Datos Iniciales)

- **Migración / DDL Inicial:** El script [`src/migrations/init.sql`](./src/migrations/init.sql) define la estructura completa de tablas, restricciones de clave foránea e índices. Se monta automáticamente en el contenedor de PostgreSQL al iniciar por primera vez (`/docker-entrypoint-initdb.d/init.sql`).
- **Script de Seed:** Script ejecutable que puebla la base de datos con especialidades (Cardiología, Traumatología, etc.), profesionales con sus matrículas, agendas y especialidades asignadas, pacientes y turnos de prueba:

```bash
npm run seed
```

---

## 3. Esqueleto de Ejecución Local

### Requisitos Previos
- **Node.js** v20+
- **Docker** y **Docker Compose**

### Variables de Entorno
Copiar el archivo `.env.example` a `.env`:
```bash
cp .env.example .env
```

### Opción A: Ejecutar todo con Docker Compose
Levanta los contenedores de la API (placeholder), base de datos (PostgreSQL 16 Alpine con healthcheck) y broker (RabbitMQ 4.2 Management):
```bash
docker compose up -d --build
```
- **API Placeholder / Health:** `http://localhost:3000/health`
- **PostgreSQL:** `localhost:5432` (Base: `iaew_turnos_db`, Usuario: `iaew`, Contraseña: `iaew-local`)
- **Panel RabbitMQ:** `http://localhost:15672` (usuario: `iaew`, contraseña: `iaew-local`)

Para detener los servicios:
```bash
docker compose down
```

### Opción B: Ejecución Local en Desarrollo

1. **Levantar base de datos y broker:**
   ```bash
   docker compose up -d postgres rabbitmq
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

3. **Cargar datos iniciales (Seed):**
   ```bash
   npm run seed
   ```

4. **Iniciar la API placeholder:**
   ```bash
   npm run dev
   ```

---

## 4. Documentación y Contratos
- **ADRs de Arquitectura:** En la carpeta [`docs/adr/`](./docs/adr/):
  - [`01_broker.md`](./docs/adr/01_broker.md): RabbitMQ para eventos asincrónicos y desacople de recordatorios.
  - [`02_bd.md`](./docs/adr/02_bd.md): PostgreSQL y modelo relacional para garantizar integridad referencial y atomicidad en reservas.
  - [`03_seguridad.md`](./docs/adr/03_seguridad.md): Auth0 con OAuth2 + JWT y RBAC con scopes granulares.
  - [`04_estilo_api.md`](./docs/adr/04_estilo_api.md): REST para transacciones y CRUD + WebSockets de solo lectura para agenda en vivo.
- **Diagramas C4:** En la carpeta `docs/Diagramas_C4/`:
  - `01_C4_Contexto`: el sistema y sus actores externos (Auth0, Sistema de Notificaciones).
  - `02_C4_Contenedores`: API REST (con WebSocket de solo lectura), PostgreSQL, RabbitMQ y Worker.
  - `03_C4_componentes`: componentes internos del container API REST.
- **Contrato OpenAPI 3.1:** En [`docs/openapi.yaml`](./docs/openapi.yaml).

## Documentación de la API (Swagger)

La documentación interactiva se sirve directamente desde el backend. Para verla abri en el navegador:

http://localhost:3000/api-docs

Ahí vas a encontrar la documentación completa de los endpoints, schemas y ejemplos de request/response.