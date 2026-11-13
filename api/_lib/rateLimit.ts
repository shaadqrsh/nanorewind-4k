import { createHash } from 'node:crypto';
import type { VercelRequest, VercelResponse } from './vercel.js';
import { getAnonSchemaClient } from './supabase.js';

type Handler = (req: VercelRequest, res: VercelResponse) => unknown;

export interface RateLimitOptions {
  name: string;      // stable bucket name; req.url isn't used because a query string would dodge it
  limit: number;     // max requests per window
  windowMs: number;
}

interface LimitResult {
  allowed: boolean;
  remaining: number;
  reset: number;     // unix seconds when the current window ends
}

// Vercel overwrites x-forwarded-for with the real client address, so the first
// entry can be trusted there. Other hosts may not do this.
export const clientIp = (req: VercelRequest): string => {
  const fwd = req.headers['x-forwarded-for'];
  const first = (Array.isArray(fwd) ? fwd[0] : fwd)?.split(',')[0]?.trim();
  const real = req.headers['x-real-ip'];
  return first || (Array.isArray(real) ? real[0] : real) || req.socket?.remoteAddress || 'unknown';
};

// Counters are keyed by a hash so raw client IPs are never stored.
const bucketKey = (name: string, ip: string) =>
  `${name}:${createHash('sha256').update(ip).digest('base64url').slice(0, 22)}`;

const formatWait = (seconds: number) => {
  if (seconds < 60) return `${seconds} second${seconds === 1 ? '' : 's'}`;
  const minutes = Math.ceil(seconds / 60);
  return `${minutes} minute${minutes === 1 ? '' : 's'}`;
};

// Wraps an API handler with a per-IP sliding-window limit backed by Postgres.
export function withRateLimit(handler: Handler, { name, limit, windowMs }: RateLimitOptions): Handler {
  const windowSeconds = Math.max(1, Math.round(windowMs / 1000));

  return async (req, res) => {
    try {
      const { data, error } = await getAnonSchemaClient()
        .rpc('hit_rate_limit', {
          p_key: bucketKey(name, clientIp(req)),
          p_limit: limit,
          p_window_seconds: windowSeconds,
        });
      if (error) throw error;
      const { allowed, remaining, reset } = data as LimitResult;

      res.setHeader('X-RateLimit-Limit', String(limit));
      res.setHeader('X-RateLimit-Remaining', String(remaining));
      res.setHeader('X-RateLimit-Reset', String(reset));

      if (!allowed) {
        const retryAfter = Math.max(1, reset - Math.floor(Date.now() / 1000));
        res.setHeader('Retry-After', String(retryAfter));
        return res.status(429).json({ error: `Too many attempts. Try again in ${formatWait(retryAfter)}.` });
      }
    } catch (err) {
      // Fail open: a limiter outage shouldn't take the app down. Restores are
      // still capped by credits.
      console.error(`Rate limit check failed (${name}):`, err);
    }

    return handler(req, res);
  };
}
