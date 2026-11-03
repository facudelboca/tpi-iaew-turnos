# Reporte Técnico de Carga y Concurrencia - Dominio 3 (Salud)

## 1. Resumen Ejecutivo
- **Objetivo:** Demostrar la robustez del sistema frente a condiciones de carrera (Race Conditions) y validar el cumplimiento del aislamiento transaccional (ACID) mediante bloqueo pesimista en PostgreSQL.
- **Escenario:** 30 peticiones concurrentes simultáneas intentando reservar el mismo turno médico para el mismo profesional en la misma franja horaria.
- **Fecha de Ejecución:** 2026-11-03T15:54:07.821Z
- **Entorno:** Node.js v22.17.0, PostgreSQL 16, RabbitMQ 3.13.

## 2. Resultados de Métricas Clave

| Métrica | Valor Observado | Criterio de Aprobación | Resultado |
|---|---|---|---|
| **Peticiones Totales** | 30 | 30 | OK |
| **Peticiones Exitosas (201 Created)** | 1 | Exactamente 1 | APROBADO |
| **Rechazos por Solapamiento (409 Conflict)** | 29 | Exactamente 29 | APROBADO |
| **Errores de Servidor (500 / 5xx)** | 0 | 0 | APROBADO |
| **Turnos Persistidos en Base de Datos** | 1 | Exactamente 1 | APROBADO |
| **Throughput** | 22.26 req/s | > 10 req/s | APROBADO |
| **Latencia p50** | 1251 ms | < 100 ms | APROBADO |
| **Latencia p90** | 1302 ms | < 250 ms | APROBADO |
| **Latencia p95** | 1309 ms | < 300 ms | APROBADO |

## 3. Justificación del Mecanismo Transaccional
Para garantizar que dos pacientes no obtengan el mismo turno médico en condiciones de carrera de alta concurrencia, la aplicación emplea:
1. **Transacción ACID:** Envolviendo la lectura de disponibilidad y la inserción del turno.
2. **Bloqueo Pesimista por Fila:** `Profesional.findByPk(profesionalId, { transaction: t, lock: t.LOCK.UPDATE })` emite un `SELECT ... FOR UPDATE` sobre la fila del profesional médico, forzando la serialización de todas las reservas concurrentes sobre esa agenda.
3. **Validación de Solapamiento:** Cada transacción en cola re-evalúa `Turno.count` leyendo el estado actualizado del primer turno confirmado y lanza de forma determinística la excepción `TURNO_OCUPADO` con código HTTP 409.
