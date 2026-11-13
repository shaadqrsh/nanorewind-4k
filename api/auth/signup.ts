import type { VercelRequest, VercelResponse } from '../_lib/vercel.js';
import { getGlobalSupabase } from '../_lib/supabase.js';
import { withRateLimit } from '../_lib/rateLimit.js';
import { ensureProfileExists } from '../_lib/profile.js';
import { publicAuthResult } from '../_lib/session.js';
import { cleanName, isEmail, isNewPassword, NEW_PASSWORD_RULE, sameOriginUrl } from '../_lib/validate.js';

async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, password, name, redirectTo } = req.body || {};
  if (!isEmail(email)) return res.status(400).json({ error: 'Enter a valid email address.' });
  if (!isNewPassword(password)) return res.status(400).json({ error: NEW_PASSWORD_RULE });

  try {
    const { data, error } = await getGlobalSupabase().auth.signUp({
      email,
      password,
      options: {
        data: { name: cleanName(name) },
        emailRedirectTo: sameOriginUrl(req, redirectTo),
      },
    });

    if (error) throw error;

    // If auto-confirm is on, we get a session immediately. Initialize profile.
    if (data.session) {
      await ensureProfileExists(data.session);
    }

    res.json(publicAuthResult(data.session, data.user));
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
}

export default withRateLimit(handler, { name: 'signup', limit: 3, windowMs: 60 * 60 * 1000 });
