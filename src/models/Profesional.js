const { DataTypes } = require('sequelize');
const { sequelize } = require('../db');

const Profesional = sequelize.define(
  'Profesional',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    nombre: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: { msg: 'El nombre del profesional es obligatorio' }
      }
    },
    apellido: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: { msg: 'El apellido del profesional es obligatorio' }
      }
    },
    matricula: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: {
        name: 'unique_profesional_matricula',
        msg: 'La matrícula ya se encuentra registrada'
      },
      validate: {
        notEmpty: { msg: 'La matrícula es obligatoria' }
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
    email: {
      type: DataTypes.STRING(150),
      allowNull: false,
      validate: {
        isEmail: { msg: 'El formato del correo es inválido' },
        notEmpty: { msg: 'El correo electrónico es obligatorio' }
      }
    },
    telefono: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    activo: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  },
  {
    tableName: 'profesionales',
    underscored: true,
    timestamps: true
  }
);

module.exports = Profesional;
