import type { VercelRequest, VercelResponse } from '../_lib/vercel.js';
import { getGlobalSupabase } from '../_lib/supabase.js';
import { withRateLimit } from '../_lib/rateLimit.js';
import { isEmail, sameOriginUrl } from '../_lib/validate.js';
import { blockCrossSite } from '../_lib/auth.js';

async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!blockCrossSite(req, res)) return;

  const { email, redirectTo } = req.body || {};
  if (!isEmail(email)) return res.status(400).json({ error: 'Enter a valid email address.' });

  try {
    // The reset link may only lead back to this site, never to one the caller chose.
    const { error } = await getGlobalSupabase().auth.resetPasswordForEmail(email, {
      redirectTo: sameOriginUrl(req, redirectTo),
    });
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
}

export default withRateLimit(handler, { name: 'recover', limit: 3, windowMs: 60 * 60 * 1000 });
