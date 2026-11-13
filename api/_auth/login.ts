import type { VercelRequest, VercelResponse } from '../_lib/vercel.js';
import { getGlobalSupabase } from '../_lib/supabase.js';
import { withRateLimit } from '../_lib/rateLimit.js';
import { ensureProfileExists } from '../_lib/profile.js';
import { publicAuthResult } from '../_lib/session.js';
import { isEmail, isPasswordInput } from '../_lib/validate.js';
import { setSessionCookies } from '../_lib/cookies.js';
import { blockCrossSite } from '../_lib/auth.js';

async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Blocks login CSRF (another site signing a visitor into the attacker's account).
  if (!blockCrossSite(req, res)) return;

  const { email, password } = req.body || {};
  if (!isEmail(email) || !isPasswordInput(password)) {
    return res.status(400).json({ error: 'Enter your email and password.' });
  }

  try {
    const { data, error } = await getGlobalSupabase().auth.signInWithPassword({ email, password });

    if (error) return res.status(401).json({ error: error.message });

    // Always ensure profile exists on login, so users from sibling apps in the
    // same project "migrate" purely by logging in.
    if (data.session) {
      await ensureProfileExists(data.session);
      setSessionCookies(res, data.session);
    }

    res.json(publicAuthResult(data.session, data.user));
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
}

export default withRateLimit(handler, { name: 'login', limit: 10, windowMs: 15 * 60 * 1000 });
