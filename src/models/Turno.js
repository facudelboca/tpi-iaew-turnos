const mongoose = require('mongoose');

const turnoSchema = new mongoose.Schema(
  {
    pacienteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Paciente',
      required: [true, 'El paciente es obligatorio']
    },
    profesionalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Profesional',
      required: [true, 'El profesional es obligatorio']
    },
    especialidadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Especialidad',
      required: [true, 'La especialidad es obligatoria']
    },
    fechaHoraInicio: {
      type: Date,
      required: [true, 'La fecha y hora de inicio es obligatoria']
    },
    fechaHoraFin: {
      type: Date,
      required: [true, 'La fecha y hora de fin es obligatoria']
    },
    motivoConsulta: {
      type: String,
      trim: true
    },
    estado: {
      type: String,
      enum: ['PENDIENTE', 'CONFIRMADO', 'CANCELADO', 'COMPLETADO'],
      default: 'PENDIENTE'
    },
    canalNotificacion: {
      type: String,
      enum: ['EMAIL', 'WHATSAPP', 'SMS'],
      default: 'EMAIL'
    },
    recordatorioEnviado: {
      type: Boolean,
      default: false
    },
    fechaRecordatorio: {
      type: Date
    },
    motivoCancelacion: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true
  }
);

// Índice compuesto para acelerar búsquedas de agenda y control de turnos
turnoSchema.index({ profesionalId: 1, fechaHoraInicio: 1, estado: 1 });
turnoSchema.index({ pacienteId: 1, fechaHoraInicio: 1 });

module.exports = mongoose.model('Turno', turnoSchema);
