const express = require('express');
const router = express.Router();
const profesionalController = require('../controllers/profesionalController');
const { validateIntegerId } = require('../middlewares/validate');

router.get('/', profesionalController.listar);
router.get('/:id', validateIntegerId('id'), profesionalController.obtenerPorId);

module.exports = router;
