const { BadRequestError } = require('../errors/AppError');

/**
 * Validador genérico de cuerpo de petición (body) según esquema declarativo.
 * @param {Object} schema 
 */
function validateBody(schema) {
  return (req, res, next) => {
    const detalles = [];

    for (const [campo, reglas] of Object.entries(schema)) {
      const valor = req.body[campo];

      // 1. Campo requerido
      if (reglas.required && (valor === undefined || valor === null || (typeof valor === 'string' && valor.trim() === ''))) {
        detalles.push({ campo, mensaje: `El campo '${campo}' es obligatorio` });
        continue;
      }

      // Validaciones sobre valor presente
      if (valor !== undefined && valor !== null && !(typeof valor === 'string' && valor.trim() === '')) {
        if (reglas.type === 'string' && typeof valor !== 'string') {
          detalles.push({ campo, mensaje: `El campo '${campo}' debe ser una cadena de texto` });
        }

        if (reglas.type === 'number' && typeof valor !== 'number') {
          detalles.push({ campo, mensaje: `El campo '${campo}' debe ser numérico` });
        }

        if (reglas.isEmail) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (typeof valor !== 'string' || !emailRegex.test(valor.trim())) {
            detalles.push({ campo, mensaje: `El campo '${campo}' debe tener un formato de correo electrónico válido` });
          }
        }

        if (reglas.isDni) {
          // Permite de 6 a 10 dígitos numéricos
          if (!/^\d{6,10}$/.test(String(valor).trim())) {
            detalles.push({ campo, mensaje: `El campo '${campo}' debe ser un número de DNI válido (entre 6 y 10 dígitos sin puntos)` });
          }
        }

        if (reglas.custom) {
          const customError = reglas.custom(valor, req.body);
          if (customError) {
            detalles.push({ campo, mensaje: customError });
          }
        }
      }
    }

    if (detalles.length > 0) {
      return next(
        new BadRequestError('La solicitud contiene datos inválidos o incompletos', 'DATOS_INVALIDOS', detalles)
      );
    }

    next();
  };
}

/**
 * Valida que un parámetro de ruta sea un entero positivo válido.
 * @param {string} paramName 
 */
function validateIntegerId(paramName = 'id') {
  return (req, res, next) => {
    const valor = req.params[paramName];
    const num = Number(valor);

    if (!Number.isInteger(num) || num <= 0) {
      return next(
        new BadRequestError(
          `El identificador '${paramName}' debe ser un número entero positivo`,
          'PARAMETRO_INVALIDO',
          [{ campo: paramName, valor, mensaje: 'Debe ser un número entero mayor a 0' }]
        )
      );
    }

    next();
  };
}

module.exports = {
  validateBody,
  validateIntegerId
};
