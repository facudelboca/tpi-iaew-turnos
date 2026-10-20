const especialidadService = require('../services/especialidadService');

async function listar(req, res, next) {
  try {
    const especialidades = await especialidadService.obtenerEspecialidades();
    res.json(especialidades);
  } catch (error) {
    next(error);
  }
}

async function obtenerPorId(req, res, next) {
  try {
    const especialidad = await especialidadService.obtenerEspecialidadPorId(req.params.id);
    res.json(especialidad);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listar,
  obtenerPorId
};
