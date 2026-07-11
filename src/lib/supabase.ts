 import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta.env.VITE_PUBLIC_SUPABASE_URL || '').trim();
const supabaseAnonKey = (import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY || '').trim();

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase URL or Anon Key is missing in environment variables.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
