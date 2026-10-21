const turnoService = require('../services/turnoService');
const { validateIdempotencyKey } = require('../lib/idempotency');

async function reservar(req, res, next) {
  try {
    const key = req.header('Idempotency-Key');
    const invalidKey = validateIdempotencyKey(key);
    if (invalidKey) {
      return res.status(400).json({
        error: invalidKey.error,
        code: invalidKey.code,
        retryable: false,
        action: 'Enviar una clave válida y estable por operación',
        details: invalidKey.details
      });
    }

    const resultado = await turnoService.reservarTurno(req.body, key);
    if (resultado.replayed) {
      res.set('Idempotency-Replayed', 'true');
      return res.status(200).json(resultado.data);
    }

    res.set('Idempotency-Replayed', 'false');
    return res.status(201).json(resultado.data);
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
