const express = require('express');
const router = express.Router();
const { requireApiKey } = require('../middlewares/auth');

router.post('/sync-especialidades', requireApiKey, (req, res) => {
  res.json({
    mensaje: 'Sincronización administrativa ejecutada correctamente',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
