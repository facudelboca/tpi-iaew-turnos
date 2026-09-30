const { sequelize } = require('../db');
const Paciente = require('./Paciente');
const Especialidad = require('./Especialidad');
const Profesional = require('./Profesional');
const ProfesionalDiaAtencion = require('./ProfesionalDiaAtencion');
const Turno = require('./Turno');

// Relación 1:N Especialidad -> Profesional
Especialidad.hasMany(Profesional, {
  as: 'profesionales',
  foreignKey: 'especialidad_id'
});
Profesional.belongsTo(Especialidad, {
  as: 'especialidad',
  foreignKey: 'especialidad_id'
});

// Relación 1:N Profesional -> Días de Atención
Profesional.hasMany(ProfesionalDiaAtencion, {
  as: 'diasAtencion',
  foreignKey: 'profesional_id',
  onDelete: 'CASCADE'
});
ProfesionalDiaAtencion.belongsTo(Profesional, {
  as: 'profesional',
  foreignKey: 'profesional_id'
});

// Relaciones con Turno
Paciente.hasMany(Turno, {
  as: 'turnos',
  foreignKey: 'paciente_id'
});
Turno.belongsTo(Paciente, {
  as: 'paciente',
  foreignKey: 'paciente_id'
});

Profesional.hasMany(Turno, {
  as: 'turnos',
  foreignKey: 'profesional_id'
});
Turno.belongsTo(Profesional, {
  as: 'profesional',
  foreignKey: 'profesional_id'
});

Especialidad.hasMany(Turno, {
  as: 'turnos',
  foreignKey: 'especialidad_id'
});
Turno.belongsTo(Especialidad, {
  as: 'especialidad',
  foreignKey: 'especialidad_id'
});

module.exports = {
  sequelize,
  Paciente,
  Especialidad,
  Profesional,
  ProfesionalDiaAtencion,
  Turno
};
