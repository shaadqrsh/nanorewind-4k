import type { VercelRequest, VercelResponse } from '../_lib/vercel.js';
import { ensureProfileExists } from '../_lib/profile.js';
import { blockCrossSite, fetchUser, resolveSession } from '../_lib/auth.js';
import { clearPkceCookie, readPkceCookie, setSessionCookies } from '../_lib/cookies.js';
import { publicUser } from '../_lib/session.js';
import { gotrue, GoTrueSession } from '../_lib/gotrue.js';

// GET  /api/auth/me  → the signed-in user (renewing the session if needed)
// POST /api/auth/me  → start a session in HttpOnly cookies from:
//                      { code }  the one-time code in an email link (PKCE), or
//                      { access_token, refresh_token }  legacy tokens: emails
//                      sent before PKCE, or localStorage from before sessions
//                      moved to cookies. The client deletes its copy.
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

// Email link (PKCE): trade the one-time code plus this browser's verifier
// cookie for a session.
async function exchangeCode(req: VercelRequest, res: VercelResponse, code: string) {
  const pkce = readPkceCookie(req);
  if (!pkce) {
    return res.status(400).json({
      // No verifier: either the link was already used here (that clears the
      // cookie), or it was opened in a different browser from the one that
      // requested it. The two look the same to us, so the message covers both.
      error: 'This link has already been used, or was opened in a different browser from the one you requested it in. If you were confirming your email, it is confirmed: just sign in.',
    });
  }

  const r = await gotrue('token', {
    query: { grant_type: 'pkce' },
    body: { auth_code: code, code_verifier: pkce.verifier },
  });
  clearPkceCookie(res);
  const session = r.data as GoTrueSession;
  if (!r.ok || !session?.access_token || !session.user?.id) {
    return res.status(400).json({ error: 'This link has expired or was already used. Request a new one.' });
  }

  await ensureProfileExists(session);
  setSessionCookies(res, session);
  res.json({ user: publicUser(session.user), purpose: pkce.purpose });
}

async function adoptSession(req: VercelRequest, res: VercelResponse) {
  if (!blockCrossSite(req, res)) return;

  const { code, access_token, refresh_token } = req.body || {};
  if (code !== undefined) {
    if (typeof code !== 'string' || !/^[A-Za-z0-9_-]{1,256}$/.test(code)) {
      return res.status(400).json({ error: 'This link is not valid.' });
    }
    try {
      return await exchangeCode(req, res, code);
    } catch (err) {
      console.error('Code exchange failed:', err);
      return res.status(500).json({ error: 'Session check failed' });
    }
  }

  // Legacy: raw tokens from an email sent before PKCE, or from localStorage.
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
