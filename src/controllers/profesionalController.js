const profesionalService = require('../services/profesionalService');

async function listar(req, res, next) {
  try {
    const { especialidadId } = req.query;
    const profesionales = await profesionalService.obtenerProfesionales({
      especialidadId: especialidadId ? parseInt(especialidadId, 10) : undefined
    });
    res.json(profesionales);
  } catch (error) {
    next(error);
  }
}

async function obtenerPorId(req, res, next) {
  try {
    const profesional = await profesionalService.obtenerProfesionalPorId(req.params.id);
    res.json(profesional);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listar,
  obtenerPorId
};
