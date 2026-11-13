import type { VercelRequest } from './vercel.js';

// Request-body checks for the auth endpoints. Supabase validates too, but
// checking shape and size here rejects junk before it reaches Supabase and
// keeps odd payloads (objects, huge strings) out of auth calls.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const isEmail = (v: unknown): v is string =>
  typeof v === 'string' && v.length <= 254 && EMAIL_RE.test(v);

// Login only checks shape: existing accounts may predate the length rules.
export const isPasswordInput = (v: unknown): v is string =>
  typeof v === 'string' && v.length > 0 && v.length <= 256;

// New passwords. 72 is bcrypt's input limit, which Supabase Auth enforces.
export const NEW_PASSWORD_RULE = 'Password must be 8 to 72 characters.';
export const isNewPassword = (v: unknown): v is string =>
  typeof v === 'string' && v.length >= 8 && v.length <= 72;

// Display names: trimmed, control characters removed, at most 80 characters.
export const cleanName = (v: unknown): string | null => {
  if (typeof v !== 'string') return null;
  const name = v.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 80);
  return name || null;
};

const requestOrigin = (req: VercelRequest): string => {
  const host = req.headers.host || '';
  const local = /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host);
  return `${local ? 'http' : 'https'}://${host}`;
};

// Email links (confirm, reset) may only point back at this site. Anything else
// is dropped and Supabase falls back to the project's Site URL.
export const sameOriginUrl = (req: VercelRequest, value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  try {
    const url = new URL(value);
    return url.origin === requestOrigin(req) ? url.toString() : undefined;
  } catch {
    return undefined;
  }
};
