const mongoose = require('mongoose');

const diaHorarioSchema = new mongoose.Schema(
  {
    dia: {
      type: String,
      enum: ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO'],
      required: true
    },
    horaInicio: {
      type: String, // formato "HH:mm" ej: "08:00"
      required: true
    },
    horaFin: {
      type: String, // formato "HH:mm" ej: "14:00"
      required: true
    }
  },
  { _id: false }
);

const profesionalSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: [true, 'El nombre del profesional es obligatorio'],
      trim: true
    },
    apellido: {
      type: String,
      required: [true, 'El apellido del profesional es obligatorio'],
      trim: true
    },
    matricula: {
      type: String,
      required: [true, 'La matrícula es obligatoria'],
      unique: true,
      trim: true
    },
    email: {
      type: String,
      required: [true, 'El email es obligatorio'],
      trim: true,
      lowercase: true
    },
    telefono: {
      type: String,
      trim: true
    },
    especialidades: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Especialidad',
        required: true
      }
    ],
    diasAtencion: [diaHorarioSchema],
    activo: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Profesional', profesionalSchema);
