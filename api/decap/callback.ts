import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Decap CMS GitHub OAuth — step 2 of 2 (the "callback" endpoint).
 *
 * GitHub redirects here with ?code=...&state=... after the user approves.
 * We verify the state cookie, exchange the code for an access token, then
 * return a tiny HTML page that postMessage()s the token back to the Decap
 * admin window that opened the popup. This message shape
 * ("authorization:github:success:{...}") is exactly what Decap listens for.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const clientId = process.env.GITHUB_OAUTH_ID;
  const clientSecret = process.env.GITHUB_OAUTH_SECRET;
  if (!clientId || !clientSecret) {
    return res.status(500).send('Missing GitHub OAuth env vars.');
  }

  const code = req.query.code as string | undefined;
  const state = req.query.state as string | undefined;
  const cookie = req.headers.cookie || '';
  const cookieState = /decap_oauth_state=([^;]+)/.exec(cookie)?.[1];

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
      return sendResult(res, false, {
        message: data.error_description || data.error || 'No access token',
      });
    }

    return sendResult(res, true, {
      token: data.access_token,
      provider: 'github',
    });
  } catch (err) {
    return sendResult(res, false, { message: (err as Error).message });
  }
}

/**
 * Returns the postMessage handshake page. Decap's admin window is the opener;
 * it first sends us "authorizing:github", we ack, then post the result.
 */
function sendResult(
  res: VercelResponse,
  ok: boolean,
  payload: Record<string, unknown>
) {
  const status = ok ? 'success' : 'error';
  const content = JSON.stringify(payload);
  const body = `<!doctype html><html><body><script>
    (function () {
      function receiveMessage(e) {
        window.opener.postMessage(
          'authorization:github:${status}:${content.replace(/'/g, "\\'")}',
          e.origin
        );
        window.removeEventListener('message', receiveMessage, false);
      }
      window.addEventListener('message', receiveMessage, false);
      // Kick off the handshake: tell the opener we're ready.
      window.opener && window.opener.postMessage('authorizing:github', '*');
    })();
  </script>Logging you in… you can close this window.</body></html>`;

  res.setHeader('Content-Type', 'text/html');
  // Clear the state cookie now that it's used.
  res.setHeader(
    'Set-Cookie',
    'decap_oauth_state=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0'
  );
  res.status(200).send(body);
}
