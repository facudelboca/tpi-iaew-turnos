require('dotenv').config();
const mongoose = require('mongoose');
const { connectDb } = require('./db');
const Especialidad = require('./models/Especialidad');
const Profesional = require('./models/Profesional');
const Paciente = require('./models/Paciente');
const Turno = require('./models/Turno');

async function seed() {
  try {
    await connectDb();
    console.log('Iniciando seed de datos para Sistema de Reserva de Turnos...');

    // Limpiar colecciones
    await Especialidad.deleteMany({});
    await Profesional.deleteMany({});
    await Paciente.deleteMany({});
    await Turno.deleteMany({});
    console.log('Colecciones limpiadas correctamente.');

    // 1. Crear Especialidades
    const especialidadesData = [
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
    ];

    const especialidades = await Especialidad.insertMany(especialidadesData);
    console.log(`✓ ${especialidades.length} especialidades creadas.`);

    // 2. Crear Profesionales
    const profesionalesData = [
      {
        nombre: 'Valeria',
        apellido: 'González',
        matricula: 'MP-45892',
        email: 'vgonzalez@salud.local',
        telefono: '+54 351 445-1201',
        especialidades: [especialidades[0]._id, especialidades[2]._id], // Cardiología y Clínica
        diasAtencion: [
          { dia: 'LUNES', horaInicio: '08:00', horaFin: '13:00' },
          { dia: 'MIERCOLES', horaInicio: '08:00', horaFin: '13:00' },
          { dia: 'VIERNES', horaInicio: '08:00', horaFin: '12:00' }
        ]
      },
      {
        nombre: 'Martín',
        apellido: 'López',
        matricula: 'MP-33104',
        email: 'mlopez@salud.local',
        telefono: '+54 351 445-1202',
        especialidades: [especialidades[1]._id], // Traumatología
        diasAtencion: [
          { dia: 'MARTES', horaInicio: '09:00', horaFin: '14:00' },
          { dia: 'JUEVES', horaInicio: '09:00', horaFin: '14:00' }
        ]
      },
      {
        nombre: 'Sofía',
        apellido: 'Herrera',
        matricula: 'MP-51299',
        email: 'sherrera@salud.local',
        telefono: '+54 351 445-1203',
        especialidades: [especialidades[3]._id], // Pediatría
        diasAtencion: [
          { dia: 'LUNES', horaInicio: '14:00', horaFin: '18:00' },
          { dia: 'MIERCOLES', horaInicio: '14:00', horaFin: '18:00' },
          { dia: 'VIERNES', horaInicio: '14:00', horaFin: '18:00' }
        ]
      }
    ];

    const profesionales = await Profesional.insertMany(profesionalesData);
    console.log(`✓ ${profesionales.length} profesionales creados.`);

    // 3. Crear Pacientes
    const pacientesData = [
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
    ];

    const pacientes = await Paciente.insertMany(pacientesData);
    console.log(`✓ ${pacientes.length} pacientes creados.`);

    // 4. Crear Turnos de ejemplo
    const mañana = new Date();
    mañana.setDate(mañana.getDate() + 1);
    mañana.setHours(9, 0, 0, 0);

    const finMañana = new Date(mañana);
    finMañana.setMinutes(finMañana.getMinutes() + 30);

    const turnosData = [
      {
        pacienteId: pacientes[0]._id,
        profesionalId: profesionales[0]._id,
        especialidadId: especialidades[0]._id,
        fechaHoraInicio: mañana,
        fechaHoraFin: finMañana,
        motivoConsulta: 'Control cardiológico anual y ecocardiograma',
        estado: 'CONFIRMADO',
        canalNotificacion: 'EMAIL'
      }
    ];

    const turnos = await Turno.insertMany(turnosData);
    console.log(`✓ ${turnos.length} turnos iniciales creados.`);

    console.log('\n--- Resumen de IDs para pruebas rápidas ---');
    console.log(`Paciente ID:     ${pacientes[0]._id} (${pacientes[0].nombre} ${pacientes[0].apellido})`);
    console.log(`Profesional ID:  ${profesionales[0]._id} (${profesionales[0].nombre} ${profesionales[0].apellido})`);
    console.log(`Especialidad ID: ${especialidades[0]._id} (${especialidades[0].nombre})`);
    console.log(`Turno ID:        ${turnos[0]._id}`);
    console.log('-------------------------------------------\n');

    console.log('Seed finalizado con éxito.');
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error durante el seed:', error);
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
    process.exit(1);
  }
}

seed();
