const { DataTypes } = require('sequelize');
const { sequelize } = require('../db');

const ProfesionalDiaAtencion = sequelize.define(
  'ProfesionalDiaAtencion',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    profesionalId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'profesional_id'
    },
    dia: {
      type: DataTypes.STRING(20),
      allowNull: false,
      validate: {
        isIn: {
          args: [['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO']],
          msg: 'Día de la semana inválido'
        }
      }
    },
    horaInicio: {
      type: DataTypes.STRING(5),
      allowNull: false,
      field: 'hora_inicio'
    },
    horaFin: {
      type: DataTypes.STRING(5),
      allowNull: false,
      field: 'hora_fin'
    }
  },
  {
    tableName: 'profesional_dias_atencion',
    underscored: true,
    timestamps: true
  }
);

module.exports = ProfesionalDiaAtencion;
