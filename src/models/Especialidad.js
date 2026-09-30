const { DataTypes } = require('sequelize');
const { sequelize } = require('../db');

const Especialidad = sequelize.define(
  'Especialidad',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    nombre: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: {
        name: 'unique_especialidad_nombre',
        msg: 'La especialidad ya existe'
      },
      validate: {
        notEmpty: { msg: 'El nombre de la especialidad es obligatorio' }
      }
    },
    descripcion: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    duracionMinutosTurno: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 30,
      field: 'duracion_minutos_turno',
      validate: {
        min: { args: [10], msg: 'La duración mínima es de 10 minutos' },
        max: { args: [120], msg: 'La duración máxima es de 120 minutos' }
      }
    },
    activo: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  },
  {
    tableName: 'especialidades',
    underscored: true,
    timestamps: true
  }
);

module.exports = Especialidad;
