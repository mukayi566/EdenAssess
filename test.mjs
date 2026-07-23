import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_PUBLIC_SUPABASE_URL, process.env.VITE_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase.from('lecturers').select('email').limit(1);
  console.log('lecturers:', data, error);
  const { data: d2, error: e2 } = await supabase.from('admins').select('email').limit(1);
  console.log('admins:', d2, e2);
}

run();
