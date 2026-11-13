import type { VercelRequest, VercelResponse } from './vercel.js';
import { getAuthConfig, makeScopedClient } from './supabase.js';
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  clearSessionCookies,
  readCookie,
  setSessionCookies,
} from './cookies.js';
import { isSameOriginRequest } from './validate.js';

type ScopedClient = ReturnType<typeof makeScopedClient>;

export interface SessionUser {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
}

export interface ResolvedSession {
  token: string;
  user: SessionUser;
}

// Calls Supabase Auth (GoTrue) directly. These are stateless per request,
// unlike a shared supabase-js client, which would hold a session in memory
// across requests on a warm serverless instance.
export const fetchUser = async (token: string): Promise<SessionUser | null> => {
  const { url, anonKey } = getAuthConfig();
  const r = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${token}` },
  });
  if (!r.ok) return null;
  const user = (await r.json().catch(() => null)) as SessionUser | null;
  return user?.id ? user : null;
};

const refreshSession = async (refreshToken: string) => {
  const { url, anonKey } = getAuthConfig();
  const r = await fetch(`${url}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: { apikey: anonKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  if (!r.ok) return null;
  const s = (await r.json().catch(() => null)) as
    | { access_token?: string; refresh_token?: string; user?: SessionUser }
    | null;
  return s?.access_token && s.user?.id ? (s as { access_token: string; refresh_token?: string; user: SessionUser }) : null;
};

// Reads the session from the HttpOnly cookies. If the access token has expired,
// renews it with the refresh token and sets fresh cookies on `res`. Returns
// null (and clears stale cookies) when there's no valid session.
export const resolveSession = async (
  req: VercelRequest,
  res: VercelResponse,
): Promise<ResolvedSession | null> => {
  const token = readCookie(req, ACCESS_COOKIE);
  const refreshToken = readCookie(req, REFRESH_COOKIE);

  if (token) {
    const user = await fetchUser(token);
    if (user) return { token, user };
  }
  if (refreshToken) {
    const s = await refreshSession(refreshToken);
    if (s) {
      setSessionCookies(res, s);
      return { token: s.access_token, user: s.user };
    }
  }
  if (token || refreshToken) clearSessionCookies(res);
  return null;
};

// Rejects state-changing requests that come from another site (CSRF).
// Writes a 403 and returns false; callers should `return` immediately.
export const blockCrossSite = (req: VercelRequest, res: VercelResponse): boolean => {
  if (req.method === 'GET' || req.method === 'HEAD' || isSameOriginRequest(req)) return true;
  res.status(403).json({ error: 'Cross-site request blocked' });
  return false;
};

export interface AuthedContext {
  user: { id: string; email: string | undefined };
  supabase: ScopedClient;
}

// Requires a signed-in caller and returns a client scoped to their token, so
// Postgres RLS applies. On failure it writes the response and returns null —
// callers should `return` immediately.
export const requireUser = async (
  req: VercelRequest,
  res: VercelResponse,
): Promise<AuthedContext | null> => {
  if (!blockCrossSite(req, res)) return null;

  try {
    const session = await resolveSession(req, res);
    if (!session) {
      res.status(401).json({ error: 'Not signed in' });
      return null;
    }
    return {
      user: { id: session.user.id, email: session.user.email },
      supabase: makeScopedClient(session.token),
    };
  } catch (err) {
    console.error('Auth error:', err);
    res.status(500).json({ error: 'Auth check failed' });
    return null;
  }
};
