import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Throwing at module load surfaces the misconfig clearly in function logs.
  throw new Error('Missing Supabase URL or Anon Key.');
}

export const SCHEMA = 'nanorewind-4k';

// Unscoped client used for auth operations (signup/login/etc).
export const globalSupabase = createClient(supabaseUrl, supabaseAnonKey);

// Per-request client scoped to the caller's token, with RLS enforced against the project schema.
export const makeScopedClient = (token: string) =>
  createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    db: { schema: SCHEMA },
  });
