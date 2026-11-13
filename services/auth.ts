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

  // Run once on load, before getSession(). Finishes an email link and moves any
  // legacy tokens into cookies. Returns what the link was for, or why it failed.
  //   ?code=...                    email link (PKCE): exchanged on the server
  //   ?error_description=...       Supabase rejected the link (expired, used)
  //   #access_token=...            email sent before PKCE (legacy)
  //   localStorage token           left by versions before cookie sessions
  handleEmailRedirect: async (): Promise<{ purpose?: 'signup' | 'recovery'; error?: string }> => {
    const query = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.substring(1));
    const code = query.get('code');
    const linkError = query.get('error_description') || hash.get('error_description');
    const accessToken = hash.get('access_token');
    const legacyToken = takeLegacyToken();

    // Clean the address bar first, so codes and tokens don't linger in history.
    if (code || linkError || accessToken) {
      window.history.replaceState(null, '', window.location.pathname);
    }

    if (linkError) return { error: linkError };
    if (code) {
      try {
        const res = await postJson('/api/auth/me', { code });
        const data = await readJson(res);
        return res.ok ? { purpose: data.purpose } : { error: data.error || 'This link could not be used.' };
      } catch {
        return { error: 'This link could not be used. Please try again.' };
      }
    }
    if (accessToken) {
      await adoptTokens(accessToken, hash.get('refresh_token')).catch(() => false);
      return { purpose: hash.get('type') === 'recovery' ? 'recovery' : 'signup' };
    }
    if (legacyToken) await adoptTokens(legacyToken).catch(() => false);
    return {};
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
      // The server remembers this was a reset (see the PKCE cookie), so the
      // link needs no marker of its own.
      redirectTo: window.location.origin + '/',
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
