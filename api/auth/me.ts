import type { VercelRequest, VercelResponse } from '../_lib/vercel.js';
import { ensureProfileExists } from '../_lib/profile.js';
import { blockCrossSite, fetchUser, resolveSession } from '../_lib/auth.js';
import { setSessionCookies } from '../_lib/cookies.js';
import { publicUser } from '../_lib/session.js';

// GET  /api/auth/me  → the signed-in user (renewing the session if needed)
// POST /api/auth/me  → adopt tokens into HttpOnly cookies. Used once, for tokens
//                      that reach the browser outside our API: the URL fragment
//                      of a Supabase email link, or localStorage from before
//                      sessions moved to cookies. The client deletes its copy.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') return getMe(req, res);
  if (req.method === 'POST') return adoptSession(req, res);
  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Method not allowed' });
}

async function getMe(req: VercelRequest, res: VercelResponse) {
  try {
    const session = await resolveSession(req, res);
    if (!session) return res.status(401).json({ error: 'Not signed in' });

    await ensureProfileExists({ user: session.user, access_token: session.token });
    res.setHeader('Cache-Control', 'private, no-store');
    res.json({ user: publicUser(session.user) });
  } catch (err) {
    console.error('Session check failed:', err);
    res.status(500).json({ error: 'Session check failed' });
  }
}

const isToken = (v: unknown): v is string => typeof v === 'string' && v.length > 0 && v.length <= 4096;

async function adoptSession(req: VercelRequest, res: VercelResponse) {
  if (!blockCrossSite(req, res)) return;

  const { access_token, refresh_token } = req.body || {};
  if (!isToken(access_token) || (refresh_token !== undefined && refresh_token !== null && !isToken(refresh_token))) {
    return res.status(400).json({ error: 'Invalid session' });
  }

  try {
    const user = await fetchUser(access_token);
    if (!user) return res.status(401).json({ error: 'Invalid session' });

    await ensureProfileExists({ user, access_token });
    setSessionCookies(res, { access_token, refresh_token: refresh_token ?? null });
    res.json({ user: publicUser(user) });
  } catch (err) {
    console.error('Session adopt failed:', err);
    res.status(500).json({ error: 'Session check failed' });
  }
}
