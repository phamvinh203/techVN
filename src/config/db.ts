import mongoose from 'mongoose';
import dotenv from 'dotenv';
// import { seedRoles } from '~/seed/role.seed';
dotenv.config();

import { createClient } from '@supabase/supabase-js';


export const connect = async (): Promise<void> => {
  try {
    await mongoose.connect(process.env.MONGO_URL as string);
    // await seedRoles();
    console.log('connect success');
  } catch (error) {
    console.log('connect error');
  }
};

export const supabase = createClient(
  process.env.SUPABASE_URL as string,
  process.env.SUPABASE_ANON_KEY as string,
);

// log để xem đã kết nối đc supabase chưa
console.log('Supabase client created:', supabase !== null);
