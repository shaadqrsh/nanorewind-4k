import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

export const SCHEMA = 'nanorewind-4k';

const assertConfig = () => {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Server misconfigured: missing SUPABASE_URL or SUPABASE_ANON_KEY.');
  }
};

// Exposes validated config for direct GoTrue REST calls (e.g. user updates,
// which supabase-js's updateUser() can't do without a stored session).
export const getAuthConfig = () => {
  assertConfig();
  return { url: supabaseUrl!, anonKey: supabaseAnonKey! };
};

// Unscoped client used for auth operations (signup/login/etc).
// Lazily created so a missing env var surfaces as a handled error, not a module-load crash.
let _global: ReturnType<typeof createClient> | null = null;
export const getGlobalSupabase = () => {
  assertConfig();
  if (!_global) _global = createClient(supabaseUrl!, supabaseAnonKey!);
  return _global;
};

// Per-request client scoped to the caller's token, with RLS enforced against the project schema.
export const makeScopedClient = (token: string) => {
  assertConfig();
  return createClient(supabaseUrl!, supabaseAnonKey!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    db: { schema: SCHEMA },
  });
};
