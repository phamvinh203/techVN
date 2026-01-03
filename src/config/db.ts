import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

export const connect = async (): Promise<void> => {
  try {
    await mongoose.connect(process.env.MONGO_URL as string);
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
  }
};
