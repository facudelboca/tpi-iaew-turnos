const pacienteService = require('../services/pacienteService');

async function listar(req, res, next) {
  try {
    const { page, limit } = req.query;
    const resultado = await pacienteService.obtenerPacientes({ page, limit });

    // Exponer cabeceras estándar de paginación para clientes HTTP
    res.setHeader('X-Total-Count', resultado.paginacion.total);
    res.setHeader('X-Page', resultado.paginacion.page);
    res.setHeader('X-Total-Pages', resultado.paginacion.totalPages);
    res.setHeader('X-Limit', resultado.paginacion.limit);

    // Retornar arreglo de pacientes conforme al contrato OpenAPI
    res.json(resultado.data);
  } catch (error) {
    next(error);
  }
}

async function obtenerPorId(req, res, next) {
  try {
    const paciente = await pacienteService.obtenerPacientePorId(req.params.id);
    res.json(paciente);
  } catch (error) {
    next(error);
  }
}

async function crear(req, res, next) {
  try {
    const nuevoPaciente = await pacienteService.crearPaciente(req.body);
    res.status(201).json(nuevoPaciente);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listar,
  obtenerPorId,
  crear
};
