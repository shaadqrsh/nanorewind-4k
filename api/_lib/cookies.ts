import type { VercelRequest, VercelResponse } from './vercel.js';

// The session lives in two HttpOnly cookies, so page JavaScript (including any
// injected script) can never read the tokens:
//   nr_at  short-lived access token, expires with the JWT
//   nr_rt  refresh token, used by the server to renew nr_at
// Both are Secure, SameSite=Strict (never sent on cross-site requests) and
// scoped to /api, the only place that needs them.
export const ACCESS_COOKIE = 'nr_at';
export const REFRESH_COOKIE = 'nr_rt';
const REFRESH_MAX_AGE_S = 30 * 24 * 60 * 60;

export const readCookie = (req: VercelRequest, name: string): string | null => {
  const header = req.headers.cookie;
  if (!header) return null;
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === name) {
      try {
        return decodeURIComponent(part.slice(i + 1).trim()) || null;
      } catch {
        return null;
      }
    }
  }
  return null;
};

const serialize = (name: string, value: string, maxAgeS: number) =>
  `${name}=${encodeURIComponent(value)}; Path=/api; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAgeS}`;

// Adds Set-Cookie values without dropping ones already set on this response.
// Later values win in the browser, so clearing after setting works.
const appendSetCookie = (res: VercelResponse, values: string[]) => {
  const prev = res.getHeader('Set-Cookie');
  const list = prev === undefined ? [] : Array.isArray(prev) ? prev.map(String) : [String(prev)];
  res.setHeader('Set-Cookie', [...list, ...values]);
};

// Seconds until a JWT's `exp`, read without verifying (Supabase verifies it on
// every use). Falls back to an hour, Supabase's default token lifetime.
export const secondsUntilExpiry = (jwt: string): number => {
  try {
    const payload = JSON.parse(Buffer.from(jwt.split('.')[1], 'base64url').toString('utf8'));
    const s = Math.floor(payload.exp - Date.now() / 1000);
    return Number.isFinite(s) ? Math.max(0, s) : 3600;
  } catch {
    return 3600;
  }
};

export const setSessionCookies = (
  res: VercelResponse,
  session: { access_token: string; refresh_token?: string | null },
) => {
  const values = [serialize(ACCESS_COOKIE, session.access_token, secondsUntilExpiry(session.access_token))];
  if (session.refresh_token) values.push(serialize(REFRESH_COOKIE, session.refresh_token, REFRESH_MAX_AGE_S));
  appendSetCookie(res, values);
};

export const clearSessionCookies = (res: VercelResponse) =>
  appendSetCookie(res, [serialize(ACCESS_COOKIE, '', 0), serialize(REFRESH_COOKIE, '', 0)]);

// --- PKCE email links ---
// When we ask Supabase to send a sign-up or password-reset email, we keep a
// secret verifier in this cookie and send Supabase only its hash. The email
// link returns a one-time code, which only works together with the verifier,
// so it can only complete sign-in in the browser that asked for the email.
// The value is "<purpose>.<verifier>" so we know which kind of link came back.
export const PKCE_COOKIE = 'nr_pkce';
export type EmailLinkPurpose = 'signup' | 'recovery';
const PKCE_MAX_AGE_S = 24 * 60 * 60;

export const setPkceCookie = (res: VercelResponse, purpose: EmailLinkPurpose, verifier: string) =>
  appendSetCookie(res, [serialize(PKCE_COOKIE, `${purpose}.${verifier}`, PKCE_MAX_AGE_S)]);

export const readPkceCookie = (req: VercelRequest): { purpose: EmailLinkPurpose; verifier: string } | null => {
  const value = readCookie(req, PKCE_COOKIE);
  const dot = value?.indexOf('.') ?? -1;
  if (!value || dot < 0) return null;
  const purpose = value.slice(0, dot);
  const verifier = value.slice(dot + 1);
  if ((purpose !== 'signup' && purpose !== 'recovery') || !/^[A-Za-z0-9_-]{43,128}$/.test(verifier)) return null;
  return { purpose, verifier };
};

export const clearPkceCookie = (res: VercelResponse) => appendSetCookie(res, [serialize(PKCE_COOKIE, '', 0)]);
