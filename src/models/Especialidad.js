const mongoose = require('mongoose');

const especialidadSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: [true, 'El nombre de la especialidad es obligatorio'],
      unique: true,
      trim: true
    },
    descripcion: {
      type: String,
      trim: true
    },
    duracionMinutosTurno: {
      type: Number,
      default: 30,
      min: [10, 'La duración mínima es de 10 minutos'],
      max: [120, 'La duración máxima es de 120 minutos']
    },
    activo: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Especialidad', especialidadSchema);
