# ADR-003: Seguridad, Autenticación y Autorización Dual

**Estado:** Aceptado

**Contexto:**
El sistema gestiona operaciones críticas de agenda médica como plataforma de integración empresarial (B2B / M2M). Se requiere una estrategia de seguridad robusta que distinga claramente entre el acceso de sistemas clientes autorizados (terminales de recepción hospitalaria, portales médicos integrados) y el acceso a operaciones internas o administrativas de infraestructura (sincronización de catálogos médicos). La solución debe evitar sesiones HTTP acopladas para permitir la interoperabilidad con clientes desacoplados y workers asincrónicos.

**Decisión:**
Implementar una **Arquitectura de Seguridad Dual** basada en estándares abiertos:

1. **Capa Externa: OAuth2 + JWT con Auth0 (M2M / RS256):**
   - Utilizado para todos los endpoints de negocio de la API (`/api/v1/turnos`, `/api/v1/pacientes`, `/api/v1/profesionales`, `/api/v1/especialidades`).
   - El Identity Provider es **Auth0**, emitiendo tokens JWT firmados con algoritmo asimétrico **RS256** validados contra el conjunto de claves públicas JWKS de Auth0.
   - Parámetros de validación:
     - Issuer Base URL: `AUTH0_ISSUER_BASE_URL` (`https://<tu-tenant>.us.auth0.com/`)
     - Audience: `AUTH0_AUDIENCE` (`https://iaew-turnos-api`)
   - El middleware `express-oauth2-jwt-bearer` valida la vigencia, firma y claims del token en cada solicitud.
   - **Autorización por Scopes Granulares:**
     - `write:turnos` requerido para crear reservas (`POST /api/v1/turnos`).
     - `read:turnos` requerido para consultar agendas y turnos (`GET /api/v1/turnos`).
     - `cancel:turnos` requerido para cancelar reservas (`PATCH /api/v1/turnos/:id/cancelar`).

2. **Capa Interna / Administrativa: Autenticación por API Key (`x-api-key`):**
   - Utilizado para endpoints de administración interna y mantenimiento de catálogos bajo el prefijo `/api/v1/admin/*` (por ejemplo, `POST /api/v1/admin/sync-especialidades`).
   - El middleware `requireApiKey` verifica la presencia y validez del encabezado HTTP `x-api-key` contra el secreto configurado en `INTERNAL_API_KEY`.
   - Permite autorizar integraciones de infraestructura y tareas por lotes automatizadas sin requerir negociación OAuth2 interactiva.

**Alternativas consideradas:**
- **Sesiones HTTP con cookies (Stateful):** Descartado. Dificulta el escalamiento horizontal sin un almacén central de sesiones y resulta incompatible con clientes Machine-to-Machine y arquitecturas orientadas a eventos.
- **Tokens simétricos (HS256) con clave compartida:** Descartado. Exige compartir el secreto criptográfico entre el emisor y el receptor, comprometiendo la seguridad ante posibles filtraciones del backend. RS256 con claves asimétricas garantiza que el backend solo verifique firmas con la clave pública de Auth0.

**Consecuencias:**
- La API es completamente *stateless* (sin estado en servidor).
- Rechazos de seguridad tipificados:
  - Sin token o con token malformado: `401 Unauthorized`.
  - Token válido pero sin los scopes suficientes: `403 Forbidden`.
  - Peticiones administrativas sin `x-api-key` o con clave errónea: `401 Unauthorized`.
- Las credenciales sensibles (`AUTH0_TEST_CLIENT_ID`, `AUTH0_TEST_CLIENT_SECRET`, `INTERNAL_API_KEY`) permanecen resguardadas en el entorno (`.env`) y bajo `.gitignore`, sin exponerse en repositorios ni contratos públicos.
