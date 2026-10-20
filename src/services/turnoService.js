const { Op } = require('sequelize');
const {
  sequelize,
  Turno,
  Paciente,
  Profesional,
  Especialidad,
  ProfesionalDiaAtencion
} = require('../models');
const { parseFechaHora } = require('../utils/dateUtils');
const { NotFoundError, ConflictError, BadRequestError } = require('../errors/AppError');

/**
 * Flujo Multi-Paso Transaccional de Reserva de Turno (ACID)
 * 1. Valida existencia y estado activo de Paciente, Profesional y Especialidad.
 * 2. Valida la agenda del profesional (día y rango horario de atención).
 * 3. En una transacción en PostgreSQL, verifica y bloquea solapamiento de horarios.
 * 4. Inserta el turno confirmado y efectúa COMMIT.
 */
async function reservarTurno(datos) {
  const {
    pacienteId,
    profesionalId,
    especialidadId,
    fechaHoraInicio,
    fechaHoraFin,
    motivoConsulta,
    canalNotificacion
  } = datos;

  // Paso 1: Validación de Paciente
  const paciente = await Paciente.findByPk(pacienteId);
  if (!paciente || !paciente.activo) {
    throw new NotFoundError('No se encontró el paciente indicado', 'PACIENTE_INEXISTENTE');
  }

  // Paso 2: Validación de Profesional y sus agendas
  const profesional = await Profesional.findByPk(profesionalId, {
    include: [
      { model: Especialidad, as: 'especialidad' },
      { model: ProfesionalDiaAtencion, as: 'diasAtencion' }
    ]
  });
  if (!profesional || !profesional.activo) {
    throw new NotFoundError('No se encontró el profesional médico indicado', 'PROFESIONAL_INEXISTENTE');
  }

  // Paso 3: Validación de Especialidad
  const idEsp = especialidadId ? parseInt(especialidadId, 10) : profesional.especialidadId;
  if (idEsp !== profesional.especialidadId) {
    throw new BadRequestError(
      `La especialidad especificada no coincide con la especialidad del profesional (${profesional.especialidad?.nombre || idEsp})`,
      'ESPECIALIDAD_NO_CORRESPONDE'
    );
  }

  // Paso 4: Validación de Fechas e Intervalo
  const inicioParsed = parseFechaHora(fechaHoraInicio);
  const finParsed = parseFechaHora(fechaHoraFin);

  if (!inicioParsed || !finParsed) {
    throw new BadRequestError('El formato de las fechas de inicio o fin es inválido', 'DATOS_INVALIDOS');
  }

  if (finParsed.date <= inicioParsed.date) {
    throw new BadRequestError(
      'La fecha y hora de fin debe ser estrictamente posterior a la de inicio',
      'DATOS_INVALIDOS',
      [{ campo: 'fechaHoraFin', mensaje: 'fechaHoraFin debe ser mayor que fechaHoraInicio' }]
    );
  }

  // Paso 5: Validación de Agenda Médica (Día y Horarios de Atención)
  const agendaDia = profesional.diasAtencion?.find(
    (d) => d.dia.toUpperCase() === inicioParsed.dia.toUpperCase()
  );

  if (!agendaDia) {
    throw new ConflictError(
      `El profesional no atiende los días ${inicioParsed.dia}`,
      'PROFESIONAL_NO_DISPONIBLE',
      [{ campo: 'fechaHoraInicio', mensaje: `El profesional no atiende el día ${inicioParsed.dia}` }]
    );
  }

  if (inicioParsed.hora < agendaDia.horaInicio || finParsed.hora > agendaDia.horaFin) {
    throw new ConflictError(
      `El horario solicitado (${inicioParsed.hora} - ${finParsed.hora}) está fuera de la franja de atención del profesional (${agendaDia.horaInicio} - ${agendaDia.horaFin})`,
      'PROFESIONAL_NO_DISPONIBLE',
      [{ campo: 'horario', mensaje: `Atención disponible: ${agendaDia.horaInicio} a ${agendaDia.horaFin}` }]
    );
  }

  // Paso 6: Transacción ACID con control estricto de solapamientos
  const t = await sequelize.transaction();

  try {
    // Control de superposición horaria:
    // turno.inicio < nuevoFin AND turno.fin > nuevoInicio
    const solapamientos = await Turno.count({
      where: {
        profesionalId: profesional.id,
        estado: 'CONFIRMADO',
        fechaHoraInicio: { [Op.lt]: finParsed.date },
        fechaHoraFin: { [Op.gt]: inicioParsed.date }
      },
      transaction: t
    });

    if (solapamientos > 0) {
      await t.rollback();
      throw new ConflictError(
        'El profesional ya tiene un turno reservado en ese horario',
        'TURNO_OCUPADO',
        [{ campo: 'fechaHoraInicio', mensaje: 'Conflicto por solapamiento con otro turno confirmado' }]
      );
    }

    // Creación atómica del turno
    const nuevoTurno = await Turno.create(
      {
        pacienteId: paciente.id,
        profesionalId: profesional.id,
        especialidadId: idEsp,
        fechaHoraInicio: inicioParsed.date,
        fechaHoraFin: finParsed.date,
        motivoConsulta: motivoConsulta || null,
        estado: 'CONFIRMADO',
        canalNotificacion: canalNotificacion ? String(canalNotificacion).toUpperCase() : 'EMAIL',
        recordatorioEnviado: false
      },
      { transaction: t }
    );

    await t.commit();

    // Recuperar turno completo con relaciones para responder al cliente
    return await Turno.findByPk(nuevoTurno.id, {
      include: [
        { model: Paciente, as: 'paciente', attributes: ['id', 'nombre', 'apellido', 'dni', 'email', 'telefono'] },
        { model: Profesional, as: 'profesional', attributes: ['id', 'nombre', 'apellido', 'matricula', 'email'] },
        { model: Especialidad, as: 'especialidad', attributes: ['id', 'nombre', 'duracionMinutosTurno'] }
      ]
    });
  } catch (error) {
    if (t && !t.finished) {
      await t.rollback();
    }
    throw error;
  }
}

/**
 * Cancelación de turno con validación de ciclo de vida
 */
async function cancelarTurno(id, motivoCancelacion) {
  const turno = await Turno.findByPk(id);

  if (!turno) {
    throw new NotFoundError('No se encontró el turno solicitado', 'TURNO_INEXISTENTE');
  }

  if (turno.estado === 'CANCELADO') {
    throw new BadRequestError('El turno ya se encuentra cancelado', 'CANCELACION_INVALIDA');
  }

  if (turno.estado === 'COMPLETADO') {
    throw new BadRequestError('No se puede cancelar un turno ya completado', 'CANCELACION_INVALIDA');
  }

  if (new Date(turno.fechaHoraInicio) <= new Date()) {
    throw new BadRequestError(
      'No se puede cancelar un turno cuya fecha y hora ya han transcurrido',
      'CANCELACION_INVALIDA'
    );
  }

  turno.estado = 'CANCELADO';
  turno.motivoCancelacion = motivoCancelacion || 'Cancelado por solicitud del paciente o administración';
  await turno.save();

  return turno;
}

/**
 * Listar turnos con filtros opcionales
 */
async function obtenerTurnos(filtros = {}) {
  const where = {};

  if (filtros.profesionalId) {
    where.profesionalId = filtros.profesionalId;
  }

  if (filtros.pacienteId) {
    where.pacienteId = filtros.pacienteId;
  }

  if (filtros.estado) {
    where.estado = String(filtros.estado).toUpperCase();
  }

  if (filtros.fecha) {
    const fechaInicioDia = new Date(`${filtros.fecha}T00:00:00.000Z`);
    const fechaFinDia = new Date(`${filtros.fecha}T23:59:59.999Z`);
    where.fechaHoraInicio = {
      [Op.between]: [fechaInicioDia, fechaFinDia]
    };
  }

  return await Turno.findAll({
    where,
    include: [
      { model: Paciente, as: 'paciente', attributes: ['id', 'nombre', 'apellido', 'dni', 'email'] },
      { model: Profesional, as: 'profesional', attributes: ['id', 'nombre', 'apellido', 'matricula'] },
      { model: Especialidad, as: 'especialidad', attributes: ['id', 'nombre', 'duracionMinutosTurno'] }
    ],
    order: [['fechaHoraInicio', 'ASC']]
  });
}

/**
 * Obtener detalle de turno por ID
 */
async function obtenerTurnoPorId(id) {
  const turno = await Turno.findByPk(id, {
    include: [
      { model: Paciente, as: 'paciente', attributes: ['id', 'nombre', 'apellido', 'dni', 'email', 'telefono'] },
      { model: Profesional, as: 'profesional', attributes: ['id', 'nombre', 'apellido', 'matricula', 'email'] },
      { model: Especialidad, as: 'especialidad', attributes: ['id', 'nombre', 'duracionMinutosTurno'] }
    ]
  });

  if (!turno) {
    throw new NotFoundError('No se encontró el turno solicitado', 'TURNO_INEXISTENTE');
  }

  return turno;
}

module.exports = {
  reservarTurno,
  cancelarTurno,
  obtenerTurnos,
  obtenerTurnoPorId
};
