import { createAuthClient } from '@neondatabase/neon-js/auth';

const getEnv = (key: string, fallback: string) => {
  // @ts-ignore
  if (typeof process !== 'undefined' && process.env && process.env[key]) return process.env[key];
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) return import.meta.env[key];
  return fallback;
};

const BACKEND_URL = getEnv('VITE_BACKEND_URL', 'http://localhost:7860');

// Type as any to avoid strict type inference issues with the auth library
let authClient: any = null;

export const setupAuth = async () => {
  try {
    const res = await fetch(`${BACKEND_URL}/api/auth-config`);
    if (!res.ok) throw new Error('Failed to fetch auth config');
    const { domain } = await res.json();
    authClient = createAuthClient(domain);
    return authClient;
  } catch (error) {
    console.error("Auth setup failed:", error);
    throw error;
  }
};

export const getAuth = () => {
  if (!authClient) {
    throw new Error("Auth client not initialized. Call setupAuth() first.");
  }
  return authClient;
};

export const authService = {
  checkQuota: async (): Promise<{ allowed: boolean; remaining: number; nextReset?: number }> => {
    try {
        const auth = getAuth();
        const { data } = await auth.getSession();
        const session = data?.session;
        if (!session) return { allowed: false, remaining: 0 };
        
        // Extract the correct JWT. Usually it's access_token or token, not the session ID itself.
        // session.id is typically just a handle.
        const token = (session as any).access_token || (session as any).token || session.id;

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