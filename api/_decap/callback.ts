import { randomBytes } from 'node:crypto';
import type { VercelRequest, VercelResponse } from '../_lib/vercel.js';
import { getAllowedOrigins, NOT_CONFIGURED_MESSAGE } from './_origins.js';

/**
 * Decap CMS GitHub OAuth — step 2 of 2 (the "callback" endpoint).
 *
 * GitHub redirects here with ?code=...&state=... after the user approves.
 * We verify the state cookie, exchange the code for an access token, then
 * return a tiny HTML page that postMessage()s the token back to the Decap
 * admin window that opened the popup. This message shape
 * ("authorization:github:success:{...}") is exactly what Decap listens for.
 *
 * The token only ever goes to an opener whose origin is in
 * DECAP_ALLOWED_ORIGINS (see _origins.ts).
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const clientId = process.env.GITHUB_OAUTH_ID;
  const clientSecret = process.env.GITHUB_OAUTH_SECRET;
  if (!clientId || !clientSecret) {
    return res.status(500).send('Missing GitHub OAuth env vars.');
  }
  const allowedOrigins = getAllowedOrigins();
  if (allowedOrigins.length === 0) {
    return res.status(503).send(NOT_CONFIGURED_MESSAGE);
  }

  const code = typeof req.query.code === 'string' ? req.query.code : undefined;
  const state = typeof req.query.state === 'string' ? req.query.state : undefined;
  const cookie = req.headers.cookie || '';
  const cookieState = /(?:^|;\s*)decap_oauth_state=([^;]+)/.exec(cookie)?.[1];

  if (!code) return res.status(400).send('Missing ?code from GitHub.');
  if (!state || state !== cookieState) {
    return res.status(400).send('OAuth state mismatch. Please try again.');
  }

  try {
    const tokenRes = await fetch(
      'https://github.com/login/oauth/access_token',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          code,
        }),
      }
    );
    const data = (await tokenRes.json()) as {
      access_token?: string;
      error?: string;
      error_description?: string;
    };

    if (data.error || !data.access_token) {
      return sendResult(res, allowedOrigins, false, {
        message: data.error_description || data.error || 'No access token',
      });
    }

    return sendResult(res, allowedOrigins, true, {
      token: data.access_token,
      provider: 'github',
    });
  } catch (err) {
    console.error('Decap token exchange failed:', err);
    return sendResult(res, allowedOrigins, false, { message: 'Token exchange failed' });
  }
}

// JSON that is safe to embed inside a <script> element.
const scriptJson = (value: unknown) =>
  JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');

/**
 * Returns the postMessage handshake page. Decap's admin window is the opener;
 * we announce ourselves, it replies "authorizing:github", and we answer with
 * the result. Every message is restricted to the allowed origins.
 */
function sendResult(
  res: VercelResponse,
  allowedOrigins: string[],
  ok: boolean,
  payload: Record<string, unknown>
) {
  const status = ok ? 'success' : 'error';
  const message = `authorization:github:${status}:${JSON.stringify(payload)}`;
  const nonce = randomBytes(16).toString('base64');

  const body = `<!doctype html><html><body><script nonce="${nonce}">
    (function () {
      var ALLOWED = ${scriptJson(allowedOrigins)};
      var MESSAGE = ${scriptJson(message)};
      if (!window.opener) return;
      function receiveMessage(e) {
        if (e.source !== window.opener || ALLOWED.indexOf(e.origin) === -1) return;
        window.removeEventListener('message', receiveMessage, false);
        window.opener.postMessage(MESSAGE, e.origin);
      }
      window.addEventListener('message', receiveMessage, false);
      // Announce readiness only to allowed origins; any other opener gets nothing.
      ALLOWED.forEach(function (origin) {
        window.opener.postMessage('authorizing:github', origin);
      });
    })();
  </script>Logging you in… you can close this window.</body></html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader(
    'Content-Security-Policy',
    `default-src 'none'; script-src 'nonce-${nonce}'; base-uri 'none'; frame-ancestors 'none'`
  );
  // Clear the state cookie now that it's used.
  res.setHeader(
    'Set-Cookie',
    'decap_oauth_state=; Path=/api/decap; HttpOnly; Secure; SameSite=Lax; Max-Age=0'
  );
  res.status(200).send(body);
}
