import { createClient } from '@supabase/supabase-js';

// Server-only. Never use VITE_-prefixed names for these: Vite exposes VITE_*
// variables to browser code.
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

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
// It must not keep sessions: one instance serves many users' requests on a warm
// serverless instance, so a stored session could leak from one user to the next.
let _global: ReturnType<typeof createClient> | null = null;
export const getGlobalSupabase = () => {
  assertConfig();
  if (!_global) {
    _global = createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
  }
  return _global;
};

// Unauthenticated client pointed at the project schema, for RPCs that run
// before sign-in (e.g. rate limiting).
const createAnonSchemaClient = () =>
  createClient(supabaseUrl!, supabaseAnonKey!, {
    db: { schema: SCHEMA },
    auth: { persistSession: false, autoRefreshToken: false },
  });
let _anonSchema: ReturnType<typeof createAnonSchemaClient> | null = null;
export const getAnonSchemaClient = () => {
  assertConfig();
  if (!_anonSchema) _anonSchema = createAnonSchemaClient();
  return _anonSchema;
};

// Per-request client scoped to the caller's token, with RLS enforced against the project schema.
export const makeScopedClient = (token: string) => {
  assertConfig();
  return createClient(supabaseUrl!, supabaseAnonKey!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    db: { schema: SCHEMA },
  });
};
