import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

export const supabase = createClient(
  process.env.SUPABASE_URL as string,
  process.env.SUPABASE_ANON_KEY as string,
);

export const BUCKET_NAMES = {
    PRODUCTS: 'products',
    AVATARS: 'avatars'
};

// Log để kiểm tra kết nối - Tránh log trong production nếu không cần thiết
if (process.env.NODE_ENV !== 'production') {
    console.log('Supabase client initialized');
}
