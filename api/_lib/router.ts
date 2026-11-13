import type { VercelRequest, VercelResponse } from './vercel.js';

type Handler = (req: VercelRequest, res: VercelResponse) => unknown;

// One serverless function serving several endpoints under a common prefix
// (e.g. /api/auth/login, /api/auth/me). Vercel Hobby allows 12 functions per
// deployment, so related endpoints share one dynamic route.
//
// The endpoint is read from the URL path rather than req.query, so a request
// can't pick a different handler by adding ?action=... to the URL.
export function routeByLastSegment(routes: Record<string, Handler>): Handler {
  const table = new Map(Object.entries(routes));
  return (req, res) => {
    const pathname = new URL(req.url ?? '/', 'http://localhost').pathname;
    const name = pathname.replace(/\/+$/, '').split('/').pop() ?? '';
    const handler = table.get(name);
    if (!handler) return res.status(404).json({ error: 'Not found' });
    return handler(req, res);
  };
}
