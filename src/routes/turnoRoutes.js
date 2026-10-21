const express = require('express');
const router = express.Router();
const turnoController = require('../controllers/turnoController');
const { validateBody, validateIntegerId } = require('../middlewares/validate');
const { requireScope } = require('../middlewares/auth');

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

router.post('/', requireScope('write:turnos'), validateBody(reservaTurnoSchema), turnoController.reservar);
router.get('/', requireScope('read:turnos'), turnoController.listar);
router.get('/:id', requireScope('read:turnos'), validateIntegerId('id'), turnoController.obtenerPorId);
router.delete('/:id', requireScope('cancel:turnos'), validateIntegerId('id'), turnoController.cancelar);
router.patch('/:id/cancelar', requireScope('cancel:turnos'), validateIntegerId('id'), turnoController.cancelar);

module.exports = router;
