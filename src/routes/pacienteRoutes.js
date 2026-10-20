const express = require('express');
const router = express.Router();
const pacienteController = require('../controllers/pacienteController');
const { validateBody, validateIntegerId } = require('../middlewares/validate');

const pacienteInputSchema = {
  nombre: { required: true, type: 'string' },
  apellido: { required: true, type: 'string' },
  dni: { required: true, isDni: true },
  email: { required: true, isEmail: true },
  telefono: { required: false, type: 'string' },
  obraSocial: { required: false, type: 'string' },
  numeroAfiliado: { required: false, type: 'string' }
};

router.get('/', pacienteController.listar);
router.get('/:id', validateIntegerId('id'), pacienteController.obtenerPorId);
router.post('/', validateBody(pacienteInputSchema), pacienteController.crear);

module.exports = router;
