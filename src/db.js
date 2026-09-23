const mongoose = require('mongoose');

async function connectDb() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/iaew_turnos_db';
  await mongoose.connect(uri);
  console.log('Conexión a MongoDB establecida exitosamente');
}

module.exports = { connectDb };
