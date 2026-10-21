const { DataTypes } = require('sequelize');
const { sequelize } = require('../db');

const EventoProcesado = sequelize.define(
  'EventoProcesado',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    eventId: {
      type: DataTypes.STRING(64),
      allowNull: false,
      unique: true,
      field: 'event_id'
    },
    type: {
      type: DataTypes.STRING(64),
      allowNull: false
    },
    turnoId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'turno_id'
    },
    procesadoEn: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'procesado_en'
    }
  },
  {
    tableName: 'eventos_procesados',
    underscored: true,
    timestamps: true
  }
);

module.exports = EventoProcesado;
