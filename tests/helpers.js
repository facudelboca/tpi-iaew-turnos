require('dotenv').config();

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Falta la variable de entorno ${name}. Definila en tu archivo .env (ver .env.example)`);
  }
  return value;
}

module.exports = { requireEnv };
