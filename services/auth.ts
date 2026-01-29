const getEnv = (key: string, fallback: string) => {
  // @ts-ignore
  if (typeof process !== 'undefined' && process.env && process.env[key]) return process.env[key];
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) return import.meta.env[key];
  return fallback;
};

const BACKEND_URL = getEnv('VITE_BACKEND_URL', 'http://localhost:7860');

// Token Management
const TOKEN_KEY = 'nanorewind_auth_token';
const getUserToken = () => localStorage.getItem(TOKEN_KEY);
const setUserToken = (token: string) => localStorage.setItem(TOKEN_KEY, token);
const clearUserToken = () => localStorage.removeItem(TOKEN_KEY);

export const authService = {
  // --- AUTH METHODS ---

  signUp: async (params: { email: string; password: string; name?: string }) => {
    const res = await fetch(`${BACKEND_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...params,
        redirectTo: window.location.origin // Ensure validation links return to this app
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Signup failed');

    if (data.session) {
      setUserToken(data.session.access_token);
    }
    return data;
  },

  signIn: async (params: { email: string; password: string }) => {
    const res = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');

    if (data.session) {
      setUserToken(data.session.access_token);
    }
    return data;
  },

  signOut: async () => {
    const token = getUserToken();
    if (token) {
      await fetch(`${BACKEND_URL}/api/auth/logout`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      }).catch(() => { });
    }
    clearUserToken();
  },

  getSession: async () => {
    const token = getUserToken();
    if (!token) return null;

    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        clearUserToken();
        return null;
      }
      const data = await res.json();
      return { user: data.user, token };
    } catch (e) {
      clearUserToken();
      return null;
    }
  },

  // --- UPDATE METHODS ---

  updateProfile: async (updates: { name?: string }) => {
    const token = getUserToken();
    if (!token) throw new Error("Not authenticated");

    const res = await fetch(`${BACKEND_URL}/api/auth/update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(updates)
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Update failed');
    return data;
  },

  updatePassword: async (password: string) => {
    const token = getUserToken();
    if (!token) throw new Error("Not authenticated");

    const res = await fetch(`${BACKEND_URL}/api/auth/update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ password })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Update failed');
    return data;
  },

  // --- QUOTA METHODS ---

  checkQuota: async (): Promise<{ allowed: boolean; remaining: number; nextReset?: number }> => {
    try {
      const token = getUserToken();
      if (!token) return { allowed: false, remaining: 0 };

      const res = await fetch(`${BACKEND_URL}/api/quota`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) return { allowed: false, remaining: 0 };
      return await res.json();
    } catch (e) {
      return { allowed: false, remaining: 0 };
    }
  },

  getToken: getUserToken
};