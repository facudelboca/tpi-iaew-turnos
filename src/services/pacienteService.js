const { Paciente } = require('../models');
const { NotFoundError, ConflictError } = require('../errors/AppError');

async function obtenerPacientes(opciones = {}) {
  const page = Math.max(1, parseInt(opciones.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(opciones.limit, 10) || 20));
  const offset = (page - 1) * limit;

  const where = {};
  if (opciones.soloActivos !== false) {
    where.activo = true;
  }

  const { rows, count } = await Paciente.findAndCountAll({
    where,
    limit,
    offset,
    order: [['apellido', 'ASC'], ['nombre', 'ASC']]
  });

  return {
    data: rows,
    paginacion: {
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit)
    }
  };
}

async function obtenerPacientePorId(id) {
  const paciente = await Paciente.findByPk(id);

  if (!paciente || !paciente.activo) {
    throw new NotFoundError(
      'No se encontró el paciente solicitado',
      'PACIENTE_INEXISTENTE'
    );
  }

  return paciente;
}

async function crearPaciente(datos) {
  const dniLimpio = String(datos.dni).trim();

  // Verificación explícita de unicidad de DNI
  const existenteDni = await Paciente.findOne({
    where: { dni: dniLimpio }
  });

  if (existenteDni) {
    throw new ConflictError(
      'Ya existe un paciente registrado con el DNI indicado',
      'PACIENTE_DNI_DUPLICADO',
      [{ campo: 'dni', valor: dniLimpio, mensaje: 'El DNI ya pertenece a otro paciente' }]
    );
  }

  const nuevoPaciente = await Paciente.create({
    nombre: datos.nombre.trim(),
    apellido: datos.apellido.trim(),
    dni: dniLimpio,
    email: datos.email.trim().toLowerCase(),
    telefono: datos.telefono ? datos.telefono.trim() : null,
    obraSocial: datos.obraSocial ? datos.obraSocial.trim() : 'Particular',
    numeroAfiliado: datos.numeroAfiliado ? datos.numeroAfiliado.trim() : null,
    activo: true
  });

  return nuevoPaciente;
}

module.exports = {
  obtenerPacientes,
  obtenerPacientePorId,
  crearPaciente
};
