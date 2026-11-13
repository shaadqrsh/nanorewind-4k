import type { VercelRequest, VercelResponse } from '../_lib/vercel.js';
import { withRateLimit } from '../_lib/rateLimit.js';
import { isEmail, sameOriginUrl } from '../_lib/validate.js';
import { blockCrossSite } from '../_lib/auth.js';
import { setPkceCookie } from '../_lib/cookies.js';
import { createPkcePair, gotrue, gotrueErrorMessage } from '../_lib/gotrue.js';

async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!blockCrossSite(req, res)) return;

  const { email, redirectTo } = req.body || {};
  if (!isEmail(email)) return res.status(400).json({ error: 'Enter a valid email address.' });

  try {
    // PKCE: the reset link only works in the browser that asked for it. Someone
    // requesting a reset for another person's email can't use the link, and
    // the owner opening an unrequested link isn't signed in by it.
    const { verifier, challenge } = createPkcePair();
    // The reset link may only lead back to this site, never to one the caller chose.
    const r = await gotrue('recover', {
      query: { redirect_to: sameOriginUrl(req, redirectTo) },
      body: { email, code_challenge: challenge, code_challenge_method: 's256' },
    });
    if (!r.ok) return res.status(400).json({ error: gotrueErrorMessage(r.data, 'Could not send the email') });

    setPkceCookie(res, 'recovery', verifier);
    res.json({ success: true });
  } catch (err) {
    console.error('Recover error:', err);
    res.status(500).json({ error: 'Could not send the email. Please try again.' });
  }
}

export default withRateLimit(handler, { name: 'recover', limit: 3, windowMs: 60 * 60 * 1000 });
