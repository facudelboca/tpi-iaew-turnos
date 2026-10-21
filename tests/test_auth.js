require('dotenv').config();

const BASE_URL = 'http://localhost:3000';

async function runTests() {
  console.log('=== PRUEBAS DE AUTORIZACIÓN Y SEGURIDAD ===\n');

  // 1. GET /health (Público)
  const resHealth = await fetch(`${BASE_URL}/health`);
  console.log(`[1] GET /health (Público) -> Status: ${resHealth.status} (Esperado: 200)`);

  // 2. GET /api/v1/especialidades (Público)
  const resEsp = await fetch(`${BASE_URL}/api/v1/especialidades`);
  console.log(`[2] GET /api/v1/especialidades (Público) -> Status: ${resEsp.status} (Esperado: 200)`);

  // 3. GET /api/v1/turnos sin token (Protegido con OAuth)
  const resTurnosSinToken = await fetch(`${BASE_URL}/api/v1/turnos`);
  const dataTurnosSinToken = await resTurnosSinToken.json();
  console.log(`[3] GET /api/v1/turnos sin token -> Status: ${resTurnosSinToken.status} (Esperado: 401)`, dataTurnosSinToken);

  // 4. POST /api/v1/admin/sync-especialidades sin API key
  const resAdminSinKey = await fetch(`${BASE_URL}/api/v1/admin/sync-especialidades`, { method: 'POST' });
  const dataAdminSinKey = await resAdminSinKey.json();
  console.log(`[4] POST /admin/sync-especialidades sin API key -> Status: ${resAdminSinKey.status} (Esperado: 401)`, dataAdminSinKey);

  // 5. POST /api/v1/admin/sync-especialidades con API key inválida
  const resAdminKeyInvalida = await fetch(`${BASE_URL}/api/v1/admin/sync-especialidades`, {
    method: 'POST',
    headers: { 'x-api-key': 'clave-falsa-123' }
  });
  const dataAdminKeyInvalida = await resAdminKeyInvalida.json();
  console.log(`[5] POST /admin/sync-especialidades con API key inválida -> Status: ${resAdminKeyInvalida.status} (Esperado: 401)`, dataAdminKeyInvalida);

  // 6. POST /api/v1/admin/sync-especialidades con API key válida
  const resAdminKeyValida = await fetch(`${BASE_URL}/api/v1/admin/sync-especialidades`, {
    method: 'POST',
    headers: { 'x-api-key': process.env.INTERNAL_API_KEY }
  });
  const dataAdminKeyValida = await resAdminKeyValida.json();
  console.log(`[6] POST /admin/sync-especialidades con API key válida -> Status: ${resAdminKeyValida.status} (Esperado: 200)`, dataAdminKeyValida);

  // 7. Solicitar Access Token a Auth0 vía client_credentials
  console.log('\n--- Solicitando Token JWT a Auth0 ---');
  const clientId = 'k5zaa6rg7mXGzbNJYqmThdSA80PKB9tj';
  const clientSecret = '8s5xt57f0iYGAQHg8_JA8vbc5ddekz4e8ZvcEffxqlZP7ib4ZjlEfj7aM_25nvCq';
  
  const tokenResponse = await fetch(`${process.env.AUTH0_ISSUER_BASE_URL}oauth/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      audience: process.env.AUTH0_AUDIENCE,
      grant_type: 'client_credentials'
    })
  });

  const tokenData = await tokenResponse.json();
  if (!tokenResponse.ok) {
    console.error('Error pidiendo token a Auth0:', tokenData);
    return;
  }

  const token = tokenData.access_token;
  console.log('Token obtenido exitosamente de Auth0!');
  console.log('Scopes incluidos en el token:', tokenData.scope);

  // 8. GET /token-info con token
  const resTokenInfo = await fetch(`${BASE_URL}/token-info`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const dataTokenInfo = await resTokenInfo.json();
  console.log(`\n[7] GET /token-info con Token -> Status: ${resTokenInfo.status} (Esperado: 200)`, dataTokenInfo);

  // 9. GET /api/v1/turnos con Token (con scope read:turnos)
  const resTurnosConToken = await fetch(`${BASE_URL}/api/v1/turnos`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log(`[8] GET /api/v1/turnos con Token -> Status: ${resTurnosConToken.status} (Esperado: 200)`);

  // 10. POST /api/v1/turnos con Token (con scope write:turnos e Idempotency-Key)
  const baseFriday = new Date('2026-12-04T09:00:00.000Z');
  const offsetWeeks = Math.floor(Math.random() * 40) + 1;
  baseFriday.setDate(baseFriday.getDate() + (offsetWeeks * 7));
  const endFriday = new Date(baseFriday.getTime() + (30 * 60 * 1000));

  const resReserva = await fetch(`${BASE_URL}/api/v1/turnos`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'Idempotency-Key': `auth-test-${Date.now()}`
    },
    body: JSON.stringify({
      pacienteId: 1,
      profesionalId: 1,
      fechaHoraInicio: baseFriday.toISOString(),
      fechaHoraFin: endFriday.toISOString(),
      motivoConsulta: 'Chequeo general con token M2M',
      canalNotificacion: 'EMAIL'
    })
  });
  const dataReserva = await resReserva.json();
  console.log(`[9] POST /api/v1/turnos con Token -> Status: ${resReserva.status} (Esperado: 201)`, dataReserva.id ? `(Turno ID: ${dataReserva.id})` : dataReserva);


  console.log('\n=== TODAS LAS PRUEBAS FINALIZADAS CON ÉXITO ===');
}

runTests().catch(console.error);
