require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const BASE_URL = 'http://localhost:3000';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function isServerRunning() {
  try {
    const res = await fetch(`${BASE_URL}/health`);
    return res.ok;
  } catch {
    return false;
  }
}

async function runDocsTest() {
  console.log('=== PRUEBA DE DOCUMENTACION INTERACTIVA OPENAPI / SWAGGER UI ===\n');

  let serverProcess = null;
  const running = await isServerRunning();

  if (!running) {
    console.log('Iniciando servidor de la API...');
    serverProcess = spawn('node', ['src/app.js'], {
      env: process.env,
      stdio: 'pipe'
    });

    let attempts = 0;
    while (attempts < 20) {
      await sleep(500);
      if (await isServerRunning()) break;
      attempts++;
    }

    if (!await isServerRunning()) {
      throw new Error('No se pudo iniciar el servidor');
    }
  }

  try {
    console.log('1. Verificando endpoint base GET /...');
    const resRoot = await fetch(`${BASE_URL}/`);
    if (!resRoot.ok) throw new Error(`Status HTTP inesperado en /: ${resRoot.status}`);
    const rootData = await resRoot.json();
    console.log('   Respuesta:', JSON.stringify(rootData));

    console.log('\n2. Verificando Swagger UI en GET /docs/...');
    const resDocs = await fetch(`${BASE_URL}/docs/`);
    if (!resDocs.ok) throw new Error(`Status HTTP inesperado en /docs/: ${resDocs.status}`);
    const htmlDocs = await resDocs.text();
    if (!htmlDocs.includes('swagger-ui')) {
      throw new Error('La respuesta de /docs/ no contiene la interfaz de Swagger UI');
    }
    console.log('   Swagger UI disponible en /docs/ (Status: ' + resDocs.status + ')');

    console.log('\n3. Verificando alias en GET /api-docs/...');
    const resApiDocs = await fetch(`${BASE_URL}/api-docs/`);
    if (!resApiDocs.ok) throw new Error(`Status HTTP inesperado en /api-docs/: ${resApiDocs.status}`);
    console.log('   Swagger UI disponible en /api-docs/ (Status: ' + resApiDocs.status + ')');

    console.log('\n4. Verificando descarga directa del contrato OpenAPI en JSON...');
    const resJson = await fetch(`${BASE_URL}/api-docs/openapi.json`);
    if (!resJson.ok) throw new Error(`No se pudo obtener el JSON en /api-docs/openapi.json: ${resJson.status}`);
    const jsonContract = await resJson.json();
    if (jsonContract.openapi !== '3.1.0' || !jsonContract.paths['/turnos']) {
      throw new Error('El JSON obtenido no coincide con el contrato esperado');
    }
    console.log('   Contrato OpenAPI 3.1 descargado exitosamente vía HTTP (Status: ' + resJson.status + ')');

    console.log('\n5. Validando contrato de evento asincronico (JSON Schema)...');
    const schemaPath = path.join(__dirname, '..', 'docs', 'eventos', 'turno-reservado.schema.json');
    if (!fs.existsSync(schemaPath)) {
      throw new Error('Archivo de schema de evento no encontrado');
    }

    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
    if (!schema.$schema || !schema.required || schema.properties?.type?.const !== 'turno.reservado') {
      throw new Error('El schema de evento no coincide con la definicion esperada');
    }
    console.log('   Contrato de evento docs/eventos/turno-reservado.schema.json validado.');

    console.log('\n6. Verificando imagenes de diagramas C4...');
    const c4Img1 = path.join(__dirname, '..', 'docs', 'Diagramas_C4', '01_C4_Contexto.png');
    const c4Img2 = path.join(__dirname, '..', 'docs', 'Diagramas_C4', '02_C4_Contenedores.png');
    const c4Img3 = path.join(__dirname, '..', 'docs', 'Diagramas_C4', '03_C4_Componentes.png');

    if (!fs.existsSync(c4Img1) || !fs.existsSync(c4Img2) || !fs.existsSync(c4Img3)) {
      throw new Error('Faltan imagenes de diagramas C4 en docs/Diagramas_C4/');
    }
    console.log('   Imagenes de diagramas C4 presentes.');

    console.log('\n=== PRUEBA DE DOCUMENTACION FINALIZADA CON EXITO ===');
  } finally {
    if (serverProcess) {
      serverProcess.kill('SIGTERM');
    }
  }
}

runDocsTest().catch((error) => {
  console.error('\nError en la prueba de documentación:', error);
  process.exit(1);
});
