const express = require('express');
const router = express.Router();
const especialidadController = require('../controllers/especialidadController');
const { validateIntegerId } = require('../middlewares/validate');

router.get('/', especialidadController.listar);
router.get('/:id', validateIntegerId('id'), especialidadController.obtenerPorId);

module.exports = router;
