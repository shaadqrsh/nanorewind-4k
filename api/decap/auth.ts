import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getProxyBaseUrl } from './_base-url.js';

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
 *   GITHUB_OAUTH_ID      — the OAuth App's Client ID          (required)
 *   GITHUB_OAUTH_SECRET  — the OAuth App's Client Secret      (used in callback.ts)
 *   OAUTH_PROXY_URL      — this proxy's public origin          (optional; see
 *                          _base-url.ts — auto-detected from the request if unset)
 */
export default function handler(req: VercelRequest, res: VercelResponse) {
  const clientId = process.env.GITHUB_OAUTH_ID;
  if (!clientId) {
    return res.status(500).send('Missing GITHUB_OAUTH_ID env var.');
  }

  // A random state value guards against CSRF; GitHub echoes it back and the
  // callback verifies it via the cookie we set here.
  const state = Math.random().toString(36).slice(2) + Date.now().toString(36);

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
    `decap_oauth_state=${state}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`
  );
  res.writeHead(302, {
    Location: `https://github.com/login/oauth/authorize?${params.toString()}`,
  });
  res.end();
}
