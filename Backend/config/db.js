const mongoose = require('mongoose');

async function connectDB() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error('MONGO_URI is missing. Create .env from .env.example and add your MongoDB connection string.');
  }

  mongoose.connection.on('connected', () => console.log('✅ MongoDB connected'));
  mongoose.connection.on('error', (error) => console.error('❌ MongoDB error:', error.message));
  mongoose.connection.on('disconnected', () => console.log('⚠️ MongoDB disconnected'));

  await mongoose.connect(mongoUri);
}

module.exports = connectDB;
