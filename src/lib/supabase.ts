import { createClient } from '@supabase/supabase-js';

export const supabaseUrl = (import.meta.env.VITE_PUBLIC_SUPABASE_URL || '').trim();
const supabaseAnonKey = (import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY || '').trim();
export const supabaseServiceRoleKey = (import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '').trim();

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase URL or Anon Key is missing in environment variables.');
}

// Standard client — anon key + RLS enforced. Used for all normal data ops.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin client — service role key, bypasses RLS. For admin-only provisioning.
export const supabaseAdmin = supabaseServiceRoleKey
    ? createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
    })
    : null;
