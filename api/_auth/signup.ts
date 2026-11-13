import type { VercelRequest, VercelResponse } from '../_lib/vercel.js';
import { withRateLimit } from '../_lib/rateLimit.js';
import { ensureProfileExists } from '../_lib/profile.js';
import { publicAuthResult } from '../_lib/session.js';
import { cleanName, isEmail, isNewPassword, NEW_PASSWORD_RULE, sameOriginUrl } from '../_lib/validate.js';
import { setPkceCookie, setSessionCookies } from '../_lib/cookies.js';
import { blockCrossSite } from '../_lib/auth.js';
import { createPkcePair, gotrue, gotrueErrorMessage, GoTrueSession } from '../_lib/gotrue.js';

async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!blockCrossSite(req, res)) return;

  const { email, password, name, redirectTo, agreed } = req.body || {};
  if (!isEmail(email)) return res.status(400).json({ error: 'Enter a valid email address.' });
  if (!isNewPassword(password)) return res.status(400).json({ error: NEW_PASSWORD_RULE });
  // The sign-up form's required box: 18 or older, and agrees to the terms and
  // privacy policy. When they agreed is kept with the account as a record.
  if (agreed !== true) {
    return res.status(400).json({ error: "Tick the box to confirm you're 18 or older and agree to the terms." });
  }

  try {
    // PKCE: the confirmation link will carry a one-time code, not tokens.
    const { verifier, challenge } = createPkcePair();
    const r = await gotrue('signup', {
      query: { redirect_to: sameOriginUrl(req, redirectTo) },
      body: {
        email,
        password,
        data: {
          ...(cleanName(name) ? { name: cleanName(name) } : {}),
          nanorewind_terms_agreed_at: new Date().toISOString(),
        },
        code_challenge: challenge,
        code_challenge_method: 's256',
      },
    });
    if (!r.ok) return res.status(400).json({ error: gotrueErrorMessage(r.data, 'Signup failed') });

    // With email confirmation on, Supabase returns just the user and emails a
    // link. With it off, it returns a session straight away.
    const session = r.data?.access_token ? (r.data as GoTrueSession) : null;
    const user = session?.user ?? (r.data?.id ? r.data : null);

    if (session) {
      await ensureProfileExists(session);
      setSessionCookies(res, session);
    } else {
      setPkceCookie(res, 'signup', verifier);
    }

    res.json(publicAuthResult(session, user));
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Signup failed. Please try again.' });
  }
}

export default withRateLimit(handler, { name: 'signup', limit: 3, windowMs: 60 * 60 * 1000 });
