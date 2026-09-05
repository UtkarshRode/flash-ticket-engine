import mongoose from 'mongoose';
import { inMemoryStore } from './inMemoryStore.js';

let isConnected = false;

export const connectDB = async () => {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/flash_tickets';
  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 2000,
    });
    console.log(`[MongoDB] Connected successfully: ${conn.connection.host}`);
    isConnected = true;
    return conn;
  } catch (error) {
    console.warn(`[MongoDB Warning] Could not connect to real MongoDB (${error.message}).`);
    inMemoryStore.activate();
    isConnected = false;
    return null;
  }
};

export const isDbConnected = () => isConnected;

