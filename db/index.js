import mongoose from 'mongoose';

let isConnecting = false;

export async function connectToDatabase(uri) {
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  if (!uri) throw new Error('MONGO_URI ausente. Configure no .env');
  if (isConnecting) return mongoose.connection;
  isConnecting = true;
  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 12000,
      dbName: undefined,
    });
    return mongoose.connection;
  } finally {
    isConnecting = false;
  }
}

export function mongoDb() {
  return mongoose.connection?.db;
}

export default { connectToDatabase, mongoDb };


