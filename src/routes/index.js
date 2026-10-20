const express = require('express');
const router = express.Router();

const especialidadRoutes = require('./especialidadRoutes');
const profesionalRoutes = require('./profesionalRoutes');
const pacienteRoutes = require('./pacienteRoutes');
const turnoRoutes = require('./turnoRoutes');

router.use('/especialidades', especialidadRoutes);
router.use('/profesionales', profesionalRoutes);
router.use('/pacientes', pacienteRoutes);
router.use('/turnos', turnoRoutes);

module.exports = router;
