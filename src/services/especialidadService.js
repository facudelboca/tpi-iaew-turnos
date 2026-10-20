const { Especialidad } = require('../models');
const { NotFoundError } = require('../errors/AppError');

async function obtenerEspecialidades(filtro = {}) {
  const where = {};
  if (filtro.soloActivas !== false) {
    where.activo = true;
  }

  return await Especialidad.findAll({
    where,
    order: [['nombre', 'ASC']]
  });
}

async function obtenerEspecialidadPorId(id) {
  const especialidad = await Especialidad.findByPk(id);
  if (!especialidad || !especialidad.activo) {
    throw new NotFoundError(
      'No se encontró la especialidad médica solicitada',
      'ESPECIALIDAD_INEXISTENTE'
    );
  }
  return especialidad;
}

module.exports = {
  obtenerEspecialidades,
  obtenerEspecialidadPorId
};
