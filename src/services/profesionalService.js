const { Profesional, Especialidad, ProfesionalDiaAtencion } = require('../models');
const { NotFoundError } = require('../errors/AppError');

async function obtenerProfesionales(filtro = {}) {
  const where = {};
  if (filtro.soloActivos !== false) {
    where.activo = true;
  }
  if (filtro.especialidadId) {
    where.especialidadId = filtro.especialidadId;
  }

  return await Profesional.findAll({
    where,
    include: [
      {
        model: Especialidad,
        as: 'especialidad',
        attributes: ['id', 'nombre', 'descripcion', 'duracionMinutosTurno']
      },
      {
        model: ProfesionalDiaAtencion,
        as: 'diasAtencion',
        attributes: ['id', 'dia', 'horaInicio', 'horaFin']
      }
    ],
    order: [['apellido', 'ASC'], ['nombre', 'ASC']]
  });
}

async function obtenerProfesionalPorId(id) {
  const profesional = await Profesional.findByPk(id, {
    include: [
      {
        model: Especialidad,
        as: 'especialidad',
        attributes: ['id', 'nombre', 'descripcion', 'duracionMinutosTurno']
      },
      {
        model: ProfesionalDiaAtencion,
        as: 'diasAtencion',
        attributes: ['id', 'dia', 'horaInicio', 'horaFin']
      }
    ]
  });

  if (!profesional || !profesional.activo) {
    throw new NotFoundError(
      'No se encontró el profesional médico solicitado',
      'PROFESIONAL_INEXISTENTE'
    );
  }

  return profesional;
}

module.exports = {
  obtenerProfesionales,
  obtenerProfesionalPorId
};
