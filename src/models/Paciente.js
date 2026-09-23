const mongoose = require('mongoose');

const pacienteSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: [true, 'El nombre es obligatorio'],
      trim: true
    },
    apellido: {
      type: String,
      required: [true, 'El apellido es obligatorio'],
      trim: true
    },
    dni: {
      type: String,
      required: [true, 'El DNI es obligatorio'],
      unique: true,
      trim: true
    },
    email: {
      type: String,
      required: [true, 'El correo electrónico es obligatorio'],
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'El formato del correo es inválido']
    },
    telefono: {
      type: String,
      trim: true
    },
    obraSocial: {
      type: String,
      trim: true,
      default: 'Particular'
    },
    numeroAfiliado: {
      type: String,
      trim: true
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

module.exports = mongoose.model('Paciente', pacienteSchema);
