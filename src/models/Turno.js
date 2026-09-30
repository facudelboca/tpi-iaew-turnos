const { DataTypes } = require('sequelize');
const { sequelize } = require('../db');

const Turno = sequelize.define(
  'Turno',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    pacienteId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'paciente_id',
      validate: {
        notNull: { msg: 'El paciente es obligatorio' }
      }
    },
    profesionalId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'profesional_id',
      validate: {
        notNull: { msg: 'El profesional es obligatorio' }
      }
    },
    especialidadId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'especialidad_id',
      validate: {
        notNull: { msg: 'La especialidad es obligatoria' }
      }
    },
    fechaHoraInicio: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'fecha_hora_inicio',
      validate: {
        notNull: { msg: 'La fecha y hora de inicio es obligatoria' }
      }
    },
    fechaHoraFin: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'fecha_hora_fin',
      validate: {
        notNull: { msg: 'La fecha y hora de fin es obligatoria' }
      }
    },
    motivoConsulta: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'motivo_consulta'
    },
    estado: {
      type: DataTypes.ENUM('PENDIENTE', 'CONFIRMADO', 'CANCELADO', 'COMPLETADO'),
      allowNull: false,
      defaultValue: 'PENDIENTE',
      validate: {
        isIn: {
          args: [['PENDIENTE', 'CONFIRMADO', 'CANCELADO', 'COMPLETADO']],
          msg: 'Estado de turno inválido'
        }
      }
    },
    canalNotificacion: {
      type: DataTypes.ENUM('EMAIL', 'WHATSAPP', 'SMS'),
      allowNull: false,
      defaultValue: 'EMAIL',
      field: 'canal_notificacion',
      validate: {
        isIn: {
          args: [['EMAIL', 'WHATSAPP', 'SMS']],
          msg: 'Canal de notificación inválido'
        }
      }
    },
    recordatorioEnviado: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'recordatorio_enviado'
    },
    fechaRecordatorio: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'fecha_recordatorio'
    },
    motivoCancelacion: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'motivo_cancelacion'
    }
  },
  {
    tableName: 'turnos',
    underscored: true,
    timestamps: true,
    indexes: [
      {
        name: 'idx_turnos_profesional_fecha_estado',
        fields: ['profesional_id', 'fecha_hora_inicio', 'estado']
      },
      {
        name: 'idx_turnos_paciente_fecha',
        fields: ['paciente_id', 'fecha_hora_inicio']
      }
    ]
  }
);

module.exports = Turno;
