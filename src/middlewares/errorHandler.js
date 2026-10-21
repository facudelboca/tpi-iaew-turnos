const { AppError } = require('../errors/AppError');

function errorHandler(err, req, res, next) {
  // 1. Errores operacionales controlados de la aplicación
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      codigo: err.codigo,
      mensaje: err.mensaje,
      detalles: err.detalles || []
    });
  }

  // 2. Errores de clave duplicada de Sequelize (Unique Constraints)
  if (err.name === 'SequelizeUniqueConstraintError') {
    const errorDetail = err.errors && err.errors[0];
    let codigo = 'CONFLICTO_DUPLICADO';
    if (errorDetail?.path === 'dni') {
      codigo = 'PACIENTE_DNI_DUPLICADO';
    } else if (errorDetail?.path === 'matricula') {
      codigo = 'PROFESIONAL_MATRICULA_DUPLICADA';
    } else if (errorDetail?.path === 'nombre') {
      codigo = 'ESPECIALIDAD_DUPLICADA';
    }

    return res.status(409).json({
      codigo,
      mensaje: errorDetail?.message || 'El recurso ya se encuentra registrado',
      detalles: err.errors ? err.errors.map(e => ({ campo: e.path, mensaje: e.message })) : []
    });
  }

  // 3. Errores de validación de Sequelize
  if (err.name === 'SequelizeValidationError') {
    return res.status(400).json({
      codigo: 'DATOS_INVALIDOS',
      mensaje: 'Falló la validación de los datos enviados',
      detalles: err.errors ? err.errors.map(e => ({ campo: e.path, mensaje: e.message })) : []
    });
  }

  // 4. Errores de sintaxis de base de datos (por ejemplo, enviar un string en un campo entero ID)
  if (err.name === 'SequelizeDatabaseError' && err.parent && err.parent.code === '22P02') {
    return res.status(400).json({
      codigo: 'PARAMETRO_INVALIDO',
      mensaje: 'El identificador proporcionado debe ser un número entero válido',
      detalles: []
    });
  }

  // 5. Errores de parseo JSON en el body de la petición
  if (err.type === 'entity.parse.failed' || (err instanceof SyntaxError && err.status === 400 && 'body' in err)) {
    return res.status(400).json({
      codigo: 'JSON_INVALIDO',
      mensaje: 'El cuerpo de la petición no es un JSON válido o está mal formateado',
      detalles: []
    });
  }

  // 6. Errores de autenticación y autorización de express-oauth2-jwt-bearer
  if (err.status === 401 || err.statusCode === 401 || err.name === 'UnauthorizedError' || err.name === 'InvalidTokenError') {
    return res.status(401).json({
      error: 'Token ausente, inválido o expirado'
    });
  }

  if (err.status === 403 || err.statusCode === 403 || err.name === 'InsufficientScopeError') {
    return res.status(403).json({
      error: 'Permisos insuficientes para ejecutar la acción'
    });
  }

  // 7. Errores no controlados / 500
  console.error('[UNHANDLED_ERROR]', err);
  return res.status(500).json({
    codigo: 'ERROR_INTERNO',
    mensaje: 'Ha ocurrido un error interno en el servidor',
    detalles: process.env.NODE_ENV === 'development' ? [err.message] : []
  });
}

module.exports = errorHandler;
