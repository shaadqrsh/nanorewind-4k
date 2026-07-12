import type { VercelRequest } from '@vercel/node';

/**
 * The public origin of this OAuth proxy (e.g. https://nanorewind-4k.vercel.app).
 *
 * Resolution order:
 *   1. OAUTH_PROXY_URL   — explicit override you set in Vercel env vars. Use this
 *                          if the proxy is reached via a custom/stable domain.
 *   2. request headers   — falls back to the host the request came in on, so it
 *                          works out of the box on the default *.vercel.app URL
 *                          without any configuration.
 *
 * Returned without a trailing slash.
 */
export function getProxyBaseUrl(req: VercelRequest): string {
  const configured = process.env.OAUTH_PROXY_URL;
  if (configured) return configured.replace(/\/$/, '');

  const proto = (req.headers['x-forwarded-proto'] as string) || 'https';
  const host = req.headers.host || '';
  return `${proto}://${host}`.replace(/\/$/, '');
}
