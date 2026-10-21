-- =============================================================================
-- Migración 002: Idempotencia y Deduplicación de Eventos
-- =============================================================================

ALTER TABLE turnos ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(128) UNIQUE;
ALTER TABLE turnos ADD COLUMN IF NOT EXISTS evento_publicado JSONB;

CREATE TABLE IF NOT EXISTS eventos_procesados (
    id SERIAL PRIMARY KEY,
    event_id VARCHAR(64) NOT NULL UNIQUE,
    type VARCHAR(64) NOT NULL,
    turno_id INTEGER NOT NULL REFERENCES turnos(id) ON DELETE CASCADE,
    procesado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
