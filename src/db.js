require('dotenv').config();
const { Sequelize } = require('sequelize');

const databaseUrl = process.env.DATABASE_URL;

let sequelize;

if (databaseUrl) {
  sequelize = new Sequelize(databaseUrl, {
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  });
} else {
  sequelize = new Sequelize(
    process.env.DB_NAME || 'iaew_turnos_db',
    process.env.DB_USER || 'iaew',
    process.env.DB_PASSWORD || 'iaew-local',
    {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      dialect: 'postgres',
      logging: process.env.NODE_ENV === 'development' ? console.log : false,
      pool: {
        max: 10,
        min: 0,
        acquire: 30000,
        idle: 10000
      }
    }
  );
}

async function connectDb() {
  await sequelize.authenticate();
  console.log('Conexión a PostgreSQL establecida exitosamente');
  // Sincronizar esquemas (en desarrollo/esqueleto inicial)
  await sequelize.sync();
  console.log('Modelos sincronizados con la base de datos');
}

module.exports = { sequelize, connectDb };
