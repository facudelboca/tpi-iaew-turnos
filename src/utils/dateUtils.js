const DIAS_SEMANA = ['DOMINGO', 'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];

/**
 * Parsea una cadena ISO de fecha y hora extrayendo el día de la semana y la hora HH:mm.
 * @param {string|Date} fechaHora 
 * @returns {{ date: Date, dia: string, hora: string, fecha: string } | null}
 */
function parseFechaHora(fechaHora) {
  const date = new Date(fechaHora);
  if (isNaN(date.getTime())) {
    return null;
  }

  const str = typeof fechaHora === 'string' ? fechaHora : date.toISOString();
  const match = str.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);

  if (match) {
    const [, y, m, d, hh, mm] = match;
    const utcDate = new Date(Date.UTC(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10)));
    const dia = DIAS_SEMANA[utcDate.getUTCDay()];
    return {
      date,
      dia,
      hora: `${hh}:${mm}`,
      fecha: `${y}-${m}-${d}`
    };
  }

  const dia = DIAS_SEMANA[date.getUTCDay()];
  const hh = String(date.getUTCHours()).padStart(2, '0');
  const mm = String(date.getUTCMinutes()).padStart(2, '0');
  return {
    date,
    dia,
    hora: `${hh}:${mm}`,
    fecha: date.toISOString().split('T')[0]
  };
}

module.exports = {
  DIAS_SEMANA,
  parseFechaHora
};
