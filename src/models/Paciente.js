const { DataTypes } = require('sequelize');
const { sequelize } = require('../db');

const Paciente = sequelize.define(
  'Paciente',
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
        notEmpty: { msg: 'El nombre es obligatorio' }
      }
    },
    apellido: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: { msg: 'El apellido es obligatorio' }
      }
    },
    dni: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: {
        name: 'unique_paciente_dni',
        msg: 'El DNI ya se encuentra registrado'
      },
      validate: {
        notEmpty: { msg: 'El DNI es obligatorio' }
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
    obraSocial: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: 'Particular',
      field: 'obra_social'
    },
    numeroAfiliado: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'numero_afiliado'
    },
    activo: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  },
  {
    tableName: 'pacientes',
    underscored: true,
    timestamps: true
  }
);

module.exports = Paciente;
