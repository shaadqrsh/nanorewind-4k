// API runs as same-origin Vercel serverless functions under /api.
//
// The session lives in HttpOnly cookies set by the API, so this code never
// sees or stores a token. Same-origin fetch() sends those cookies automatically.
import { readJson } from './http';

// Where older versions kept the token. Read once to migrate, then deleted.
const LEGACY_TOKEN_KEY = 'nanorewind_auth_token';

const postJson = (url: string, body: unknown = {}) =>
  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

// Hands tokens that reached the page outside the API to the server, which
// moves them into HttpOnly cookies.
const adoptTokens = async (accessToken: string, refreshToken?: string | null) => {
  const res = await postJson('/api/auth/me', { access_token: accessToken, refresh_token: refreshToken ?? null });
  return res.ok;
};

const takeLegacyToken = (): string | null => {
  try {
    const token = localStorage.getItem(LEGACY_TOKEN_KEY);
    localStorage.removeItem(LEGACY_TOKEN_KEY);
    return token;
  } catch {
    return null;
  }
};

export const authService = {
  // --- AUTH METHODS ---

  // Run once on load, before getSession(). Moves tokens out of places page
  // scripts can read: a Supabase email link puts them in the URL fragment, and
  // older versions of this app kept one in localStorage.
  handleEmailRedirect: async (): Promise<void> => {
    const params = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = params.get('access_token');
    const legacyToken = takeLegacyToken();

    if (accessToken) {
      // Clear the fragment first so the tokens don't linger in the address bar.
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
      await adoptTokens(accessToken, params.get('refresh_token')).catch(() => false);
    } else if (legacyToken) {
      await adoptTokens(legacyToken).catch(() => false);
    }
  },

  signUp: async (params: { email: string; password: string; name?: string }) => {
    const res = await postJson('/api/auth/signup', {
      ...params,
      redirectTo: window.location.origin, // Ensure validation links return to this app
    });
    const data = await readJson(res);
    if (!res.ok) throw new Error(data.error || 'Signup failed');
    return data;
  },

  signIn: async (params: { email: string; password: string }) => {
    const res = await postJson('/api/auth/login', params);
    const data = await readJson(res);
    if (!res.ok) throw new Error(data.error || 'Login failed');
    return data;
  },

  signOut: async () => {
    await postJson('/api/auth/logout').catch(() => { });
  },

  getSession: async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (!res.ok) return null;
      const data = await readJson(res);
      return data.user ? { user: data.user } : null;
    } catch {
      return null;
    }
  },

  // --- UPDATE METHODS ---

  updateProfile: async (updates: { name?: string }) => {
    const res = await postJson('/api/auth/update', updates);
    const data = await readJson(res);
    if (!res.ok) throw new Error(data.error || 'Update failed');
    return data;
  },

  updatePassword: async (password: string) => {
    const res = await postJson('/api/auth/update', { password });
    const data = await readJson(res);
    if (!res.ok) throw new Error(data.error || 'Update failed');
    return data;
  },

  resetPassword: async (email: string) => {
    const res = await postJson('/api/auth/recover', {
      email,
      redirectTo: window.location.origin + '/#reset-password', // Optional: redirect to specific view
    });
    const data = await readJson(res);
    if (!res.ok) throw new Error(data.error || 'Failed to send recovery email');
    return data;
  },

  // --- QUOTA METHODS ---

  checkQuota: async (): Promise<{ allowed: boolean; remaining: number; nextReset?: number }> => {
    try {
      const res = await fetch('/api/quota');
      if (!res.ok) return { allowed: false, remaining: 0 };
      return await readJson(res);
    } catch {
      return { allowed: false, remaining: 0 };
    }
  },
};
