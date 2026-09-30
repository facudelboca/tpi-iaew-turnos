-- =============================================================================
-- Script DDL de Inicialización / Migración Inicial
-- Dominio: Sistema de Reserva de Turnos de Salud (IAEW 2026)
-- Motor: PostgreSQL 16+
-- =============================================================================

-- 1. Tabla Especialidades
CREATE TABLE IF NOT EXISTS especialidades (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    descripcion TEXT,
    duracion_minutos_turno INTEGER NOT NULL DEFAULT 30 CHECK (duracion_minutos_turno >= 10 AND duracion_minutos_turno <= 120),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabla Profesionales (1 Especialidad por Profesional)
CREATE TABLE IF NOT EXISTS profesionales (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    matricula VARCHAR(50) NOT NULL UNIQUE,
    especialidad_id INTEGER NOT NULL REFERENCES especialidades(id) ON DELETE RESTRICT,
    email VARCHAR(150) NOT NULL,
    telefono VARCHAR(50),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabla Días y Horarios de Atención del Profesional
CREATE TABLE IF NOT EXISTS profesional_dias_atencion (
    id SERIAL PRIMARY KEY,
    profesional_id INTEGER NOT NULL REFERENCES profesionales(id) ON DELETE CASCADE,
    dia VARCHAR(20) NOT NULL CHECK (dia IN ('LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO')),
    hora_inicio VARCHAR(5) NOT NULL,
    hora_fin VARCHAR(5) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Tabla Pacientes
CREATE TABLE IF NOT EXISTS pacientes (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    dni VARCHAR(20) NOT NULL UNIQUE,
    email VARCHAR(150) NOT NULL,
    telefono VARCHAR(50),
    obra_social VARCHAR(100) NOT NULL DEFAULT 'Particular',
    numero_afiliado VARCHAR(50),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Tabla Turnos (Núcleo transaccional)
CREATE TABLE IF NOT EXISTS turnos (
    id SERIAL PRIMARY KEY,
    paciente_id INTEGER NOT NULL REFERENCES pacientes(id) ON DELETE RESTRICT,
    profesional_id INTEGER NOT NULL REFERENCES profesionales(id) ON DELETE RESTRICT,
    especialidad_id INTEGER NOT NULL REFERENCES especialidades(id) ON DELETE RESTRICT,
    fecha_hora_inicio TIMESTAMP WITH TIME ZONE NOT NULL,
    fecha_hora_fin TIMESTAMP WITH TIME ZONE NOT NULL,
    motivo_consulta TEXT,
    estado VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE', 'CONFIRMADO', 'CANCELADO', 'COMPLETADO')),
    canal_notificacion VARCHAR(20) NOT NULL DEFAULT 'EMAIL' CHECK (canal_notificacion IN ('EMAIL', 'WHATSAPP', 'SMS')),
    recordatorio_enviado BOOLEAN NOT NULL DEFAULT FALSE,
    fecha_recordatorio TIMESTAMP WITH TIME ZONE,
    motivo_cancelacion TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para optimización de consultas de agenda, disponibilidad y solapamientos
CREATE INDEX IF NOT EXISTS idx_turnos_profesional_fecha_estado 
    ON turnos(profesional_id, fecha_hora_inicio, estado);

CREATE INDEX IF NOT EXISTS idx_turnos_paciente_fecha 
    ON turnos(paciente_id, fecha_hora_inicio);
