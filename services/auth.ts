import { createAuthClient } from '@neondatabase/neon-js/auth';

const getEnv = (key: string, fallback: string) => {
  // @ts-ignore
  if (typeof process !== 'undefined' && process.env && process.env[key]) return process.env[key];
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) return import.meta.env[key];
  return fallback;
};

const BACKEND_URL = getEnv('VITE_BACKEND_URL', 'http://localhost:7860');
const NEON_AUTH_URL = getEnv('VITE_NEON_AUTH_URL', '');

export const auth = createAuthClient({
  domain: NEON_AUTH_URL,
});

export const authService = {
  checkQuota: async (): Promise<{ allowed: boolean; remaining: number; nextReset?: number }> => {
    try {
        const session = await auth.getSession();
        if (!session) return { allowed: false, remaining: 0 };
        
        const res = await fetch(`${BACKEND_URL}/api/quota`, {
            headers: { 'Authorization': `Bearer ${session.accessToken}` }
        });
        if (!res.ok) return { allowed: false, remaining: 0 };
        return await res.json();
    } catch (e) {
        return { allowed: false, remaining: 0 };
    }
  }
};