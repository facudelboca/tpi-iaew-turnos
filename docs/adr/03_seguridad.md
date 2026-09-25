
## ADR-003: Seguridad y autorización

**Estado:** Aceptado

**Contexto:**
Se definen scopes granulares: `read:turnos`, `write:turnos`, `cancel:turnos`, `admin:profesionales`. Se requiere un modelo de autorización basado en permisos, no solo autenticación binaria.

**Decisión:**
Usar **Auth0** como Identity Provider, con **OAuth2 + JWT** y scopes embebidos en el token (vía Auth0 Rules/Actions o RBAC nativo de Auth0), validados por middleware en cada endpoint del backend.

**Alternativas consideradas:**
- Sesiones server-side: descartado — no encaja bien con los workers que consumen eventos del broker (`turno.reservado`), que no deberían depender de una sesión HTTP activa.

**Consecuencias:**
- Se configuran roles en Auth0 (`Paciente`, `Profesional`, `Admin`) mapeados a los scopes vía RBAC.
- `admin:profesionales` queda restringido al rol `Admin`.
- `cancel:turnos` lo tienen `Paciente` (solo sobre sus propios turnos) y `Admin` — esto requiere una validación adicional de *ownership* a nivel de código (comparar `paciente.id` del turno contra el `sub` del JWT), ya que el scope por sí solo no alcanza para restringir a "sus propios turnos".
- El middleware de autorización valida tanto el scope como, cuando corresponde, el ownership del recurso.

---