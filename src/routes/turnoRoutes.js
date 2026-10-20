const express = require('express');
const router = express.Router();
const turnoController = require('../controllers/turnoController');
const { validateBody, validateIntegerId } = require('../middlewares/validate');

const reservaTurnoSchema = {
  pacienteId: { required: true },
  profesionalId: { required: true },
  fechaHoraInicio: { required: true, type: 'string' },
  fechaHoraFin: { required: true, type: 'string' },
  motivoConsulta: { required: false, type: 'string' },
  canalNotificacion: {
    required: false,
    custom: (valor) => {
      if (valor && !['EMAIL', 'WHATSAPP', 'SMS'].includes(String(valor).toUpperCase())) {
        return "El canal de notificación debe ser 'EMAIL', 'WHATSAPP' o 'SMS'";
      }
      return null;
    }
  }
};

// Rutas de turnos
router.post('/', validateBody(reservaTurnoSchema), turnoController.reservar);
router.get('/', turnoController.listar);
router.get('/:id', validateIntegerId('id'), turnoController.obtenerPorId);
router.delete('/:id', validateIntegerId('id'), turnoController.cancelar);
router.patch('/:id/cancelar', validateIntegerId('id'), turnoController.cancelar);

module.exports = router;
