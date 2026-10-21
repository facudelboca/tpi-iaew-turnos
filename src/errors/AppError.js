class AppError extends Error {
  constructor(mensaje, codigo = 'ERROR_INTERNO', statusCode = 500, detalles = []) {
    super(mensaje);
    this.name = this.constructor.name;
    this.mensaje = mensaje;
    this.codigo = codigo;
    this.statusCode = statusCode;
    this.detalles = detalles;
    Error.captureStackTrace(this, this.constructor);
  }
}

class NotFoundError extends AppError {
  constructor(mensaje = 'Recurso no encontrado', codigo = 'RECURSO_NO_ENCONTRADO', detalles = []) {
    super(mensaje, codigo, 404, detalles);
  }
}

class ConflictError extends AppError {
  constructor(mensaje = 'Conflicto con el estado actual del recurso', codigo = 'CONFLICTO', detalles = []) {
    super(mensaje, codigo, 409, detalles);
  }
}

class BadRequestError extends AppError {
  constructor(mensaje = 'Datos de solicitud inválidos', codigo = 'DATOS_INVALIDOS', detalles = []) {
    super(mensaje, codigo, 400, detalles);
  }
}

class UnauthorizedError extends AppError {
  constructor(mensaje = 'No autorizado. Se requiere un token o credencial válida.', codigo = 'NO_AUTORIZADO', detalles = []) {
    super(mensaje, codigo, 401, detalles);
  }
}

class ForbiddenError extends AppError {
  constructor(mensaje = 'Acceso denegado. Permisos o scopes insuficientes.', codigo = 'ACCESO_DENEGADO', detalles = []) {
    super(mensaje, codigo, 403, detalles);
  }
}

module.exports = {
  AppError,
  NotFoundError,
  ConflictError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError
};
