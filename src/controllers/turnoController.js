const turnoService = require('../services/turnoService');

async function reservar(req, res, next) {
  try {
    const turno = await turnoService.reservarTurno(req.body);
    res.status(201).json(turno);
  } catch (error) {
    next(error);
  }
}

async function cancelar(req, res, next) {
  try {
    const { id } = req.params;
    const { motivoCancelacion } = req.body || {};
    const turnoCancelado = await turnoService.cancelarTurno(id, motivoCancelacion);
    res.status(200).json(turnoCancelado);
  } catch (error) {
    next(error);
  }
}

async function listar(req, res, next) {
  try {
    const turnos = await turnoService.obtenerTurnos(req.query);
    res.json(turnos);
  } catch (error) {
    next(error);
  }
}

async function obtenerPorId(req, res, next) {
  try {
    const turno = await turnoService.obtenerTurnoPorId(req.params.id);
    res.json(turno);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  reservar,
  cancelar,
  listar,
  obtenerPorId
};
