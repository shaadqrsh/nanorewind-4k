import { createClient, SupabaseClient, User } from '@supabase/supabase-js';

const getEnv = (key: string, fallback: string) => {
  // @ts-ignore
  if (typeof process !== 'undefined' && process.env && process.env[key]) return process.env[key];
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) return import.meta.env[key];
  return fallback;
};

const BACKEND_URL = getEnv('VITE_BACKEND_URL', 'http://localhost:7860');
const SUPABASE_URL = getEnv('VITE_SUPABASE_URL', '');
const SUPABASE_ANON_KEY = getEnv('VITE_SUPABASE_ANON_KEY', '');

let supabase: SupabaseClient | null = null;

export const setupAuth = async () => {
  if (supabase) return supabase;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error("Missing Supabase configuration. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
    throw new Error("Missing Supabase configuration");
  }

  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return supabase;
};

export const getAuth = () => {
  if (!supabase) {
    // Attempt lazy init if env vars are present, otherwise throw
    if (SUPABASE_URL && SUPABASE_ANON_KEY) {
      supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      return supabase;
    }
    throw new Error("Auth client not initialized. Call setupAuth() first.");
  }
  return supabase;
};

export const authService = {
  checkQuota: async (): Promise<{ allowed: boolean; remaining: number; nextReset?: number }> => {
    try {
      const client = getAuth();
      const { data: { session } } = await client.auth.getSession();

      if (!session) return { allowed: false, remaining: 0 };

      const token = session.access_token;

      const res = await fetch(`${BACKEND_URL}/api/quota`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) return { allowed: false, remaining: 0 };
      return await res.json();
    } catch (e) {
      return { allowed: false, remaining: 0 };
    }
  }
};