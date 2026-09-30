require('dotenv').config();
const {
  sequelize,
  Especialidad,
  Profesional,
  ProfesionalDiaAtencion,
  Paciente,
  Turno
} = require('./models');

async function seed() {
  try {
    console.log('Conectando a PostgreSQL para ejecutar seed...');
    await sequelize.authenticate();
    
    // Forzar recreación limpia de tablas
    await sequelize.sync({ force: true });
    console.log('Tablas recreadas y limpias exitosamente.');

    // 1. Crear Especialidades
    const especialidades = await Especialidad.bulkCreate([
      {
        nombre: 'Cardiología',
        descripcion: 'Especialidad médica encargada de las enfermedades del corazón y del aparato circulatorio.',
        duracionMinutosTurno: 30
      },
      {
        nombre: 'Traumatología',
        descripcion: 'Estudio de las lesiones del aparato locomotor y sistema osteomuscular.',
        duracionMinutosTurno: 30
      },
      {
        nombre: 'Clínica Médica',
        descripcion: 'Atención integral del adulto, diagnóstico clínico preventivo y de patologías complejas.',
        duracionMinutosTurno: 20
      },
      {
        nombre: 'Pediatría',
        descripcion: 'Atención médica integral del paciente pediátrico desde el nacimiento hasta la adolescencia.',
        duracionMinutosTurno: 30
      },
      {
        nombre: 'Dermatología',
        descripcion: 'Diagnóstico y tratamiento de patologías de la piel, mucosas, uñas y cabello.',
        duracionMinutosTurno: 20
      }
    ]);
    console.log(`✓ ${especialidades.length} especialidades creadas.`);

    // 2. Crear Profesionales (1 Especialidad por Profesional)
    const prof1 = await Profesional.create({
      nombre: 'Valeria',
      apellido: 'González',
      matricula: 'MP-45892',
      especialidadId: especialidades[0].id, // Cardiología
      email: 'vgonzalez@salud.local',
      telefono: '+54 351 445-1201'
    });
    await ProfesionalDiaAtencion.bulkCreate([
      { profesionalId: prof1.id, dia: 'LUNES', horaInicio: '08:00', horaFin: '13:00' },
      { profesionalId: prof1.id, dia: 'MIERCOLES', horaInicio: '08:00', horaFin: '13:00' },
      { profesionalId: prof1.id, dia: 'VIERNES', horaInicio: '08:00', horaFin: '12:00' }
    ]);

    const prof2 = await Profesional.create({
      nombre: 'Martín',
      apellido: 'López',
      matricula: 'MP-33104',
      especialidadId: especialidades[1].id, // Traumatología
      email: 'mlopez@salud.local',
      telefono: '+54 351 445-1202'
    });
    await ProfesionalDiaAtencion.bulkCreate([
      { profesionalId: prof2.id, dia: 'MARTES', horaInicio: '09:00', horaFin: '14:00' },
      { profesionalId: prof2.id, dia: 'JUEVES', horaInicio: '09:00', horaFin: '14:00' }
    ]);

    const prof3 = await Profesional.create({
      nombre: 'Sofía',
      apellido: 'Herrera',
      matricula: 'MP-51299',
      especialidadId: especialidades[3].id, // Pediatría
      email: 'sherrera@salud.local',
      telefono: '+54 351 445-1203'
    });
    await ProfesionalDiaAtencion.bulkCreate([
      { profesionalId: prof3.id, dia: 'LUNES', horaInicio: '14:00', horaFin: '18:00' },
      { profesionalId: prof3.id, dia: 'MIERCOLES', horaInicio: '14:00', horaFin: '18:00' },
      { profesionalId: prof3.id, dia: 'VIERNES', horaInicio: '14:00', horaFin: '18:00' }
    ]);

    console.log(`✓ 3 profesionales creados con su especialidad y agendas asociadas.`);

    // 3. Crear Pacientes
    const pacientes = await Paciente.bulkCreate([
      {
        nombre: 'Juan',
        apellido: 'Pérez',
        dni: '38123456',
        email: 'juan.perez@example.com',
        telefono: '+54 351 555-0101',
        obraSocial: 'OSDE',
        numeroAfiliado: 'OSDE-984512-01'
      },
      {
        nombre: 'María',
        apellido: 'Rodríguez',
        dni: '40987654',
        email: 'maria.rodriguez@example.com',
        telefono: '+54 351 555-0102',
        obraSocial: 'Swiss Medical',
        numeroAfiliado: 'SM-112233-02'
      },
      {
        nombre: 'Carlos',
        apellido: 'Gómez',
        dni: '29876543',
        email: 'carlos.gomez@example.com',
        telefono: '+54 351 555-0103',
        obraSocial: 'Particular',
        numeroAfiliado: null
      }
    ]);
    console.log(`✓ ${pacientes.length} pacientes creados.`);

    // 4. Crear Turno de ejemplo
    const mañana = new Date();
    mañana.setDate(mañana.getDate() + 1);
    mañana.setHours(9, 0, 0, 0);

    const finMañana = new Date(mañana);
    finMañana.setMinutes(finMañana.getMinutes() + 30);

    const turno = await Turno.create({
      pacienteId: pacientes[0].id,
      profesionalId: prof1.id,
      especialidadId: especialidades[0].id,
      fechaHoraInicio: mañana,
      fechaHoraFin: finMañana,
      motivoConsulta: 'Control cardiológico anual y ecocardiograma',
      estado: 'CONFIRMADO',
      canalNotificacion: 'EMAIL'
    });
    console.log(`✓ 1 turno inicial de prueba creado.`);

    console.log('\n--- Resumen de IDs para pruebas rápidas ---');
    console.log(`Paciente ID:     ${pacientes[0].id} (${pacientes[0].nombre} ${pacientes[0].apellido})`);
    console.log(`Profesional ID:  ${prof1.id} (${prof1.nombre} ${prof1.apellido}) - Esp: ${especialidades[0].nombre}`);
    console.log(`Especialidad ID: ${especialidades[0].id} (${especialidades[0].nombre})`);
    console.log(`Turno ID:        ${turno.id}`);
    console.log('-------------------------------------------\n');

    console.log('Seed de PostgreSQL finalizado con éxito.');
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('Error durante el seed:', error);
    await sequelize.close();
    process.exit(1);
  }
}

seed();
