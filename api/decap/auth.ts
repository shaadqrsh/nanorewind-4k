import { randomBytes } from 'node:crypto';
import type { VercelRequest, VercelResponse } from '../_lib/vercel.js';
import { getProxyBaseUrl } from './_base-url.js';
import { getAllowedOrigins, NOT_CONFIGURED_MESSAGE } from './_origins.js';

/**
 * Decap CMS GitHub OAuth — step 1 of 2 (the "auth" endpoint).
 *
 * Decap opens this URL in a popup. We redirect the popup to GitHub's
 * authorization screen. After the user approves, GitHub redirects back to
 * our /api/decap/callback endpoint (see callback.ts), which finishes the
 * handshake and hands the token back to Decap.
 *
 * This serves the Emaad portfolio (and any other Decap site) as a shared,
 * free OAuth proxy hosted alongside this app's other Vercel functions.
 *
 * Environment variables:
 *   GITHUB_OAUTH_ID        — the OAuth App's Client ID          (required)
 *   GITHUB_OAUTH_SECRET    — the OAuth App's Client Secret      (used in callback.ts)
 *   DECAP_ALLOWED_ORIGINS  — sites allowed to receive tokens     (required; see _origins.ts)
 *   OAUTH_PROXY_URL        — this proxy's public origin          (optional; see
 *                            _base-url.ts — auto-detected from the request if unset)
 */
export default function handler(req: VercelRequest, res: VercelResponse) {
  const clientId = process.env.GITHUB_OAUTH_ID;
  if (!clientId) {
    return res.status(500).send('Missing GITHUB_OAUTH_ID env var.');
  }
  if (getAllowedOrigins().length === 0) {
    return res.status(503).send(NOT_CONFIGURED_MESSAGE);
  }

  // A random state value guards against CSRF; GitHub echoes it back and the
  // callback verifies it via the cookie we set here.
  const state = randomBytes(16).toString('hex');

  const redirectUri = `${getProxyBaseUrl(req)}/api/decap/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'repo,user',
    state,
    allow_signup: 'false',
  });

  res.setHeader(
    'Set-Cookie',
    `decap_oauth_state=${state}; Path=/api/decap; HttpOnly; Secure; SameSite=Lax; Max-Age=600`
  );
  res.setHeader('Cache-Control', 'no-store');
  res.writeHead(302, {
    Location: `https://github.com/login/oauth/authorize?${params.toString()}`,
  });
  res.end();
}
