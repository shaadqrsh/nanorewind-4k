import { createHash, randomBytes } from 'node:crypto';
import { getAuthConfig } from './supabase.js';

// Direct calls to Supabase Auth (GoTrue). Used where supabase-js would keep
// state (PKCE verifiers, sessions) inside a shared client.

export interface GoTrueSession {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
  user: { id: string; email?: string; user_metadata?: Record<string, unknown> };
}

export const gotrueErrorMessage = (body: any, fallback: string): string =>
  body?.msg || body?.error_description || body?.message || fallback;

export const gotrue = async (
  path: string,
  { body, query }: { body?: unknown; query?: Record<string, string | undefined> } = {},
) => {
  const { url, anonKey } = getAuthConfig();
  const qs = new URLSearchParams(
    Object.entries(query ?? {}).filter((e): e is [string, string] => typeof e[1] === 'string'),
  ).toString();
  const r = await fetch(`${url}/auth/v1/${path}${qs ? `?${qs}` : ''}`, {
    method: 'POST',
    headers: { apikey: anonKey, 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  });
  const data = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, data };
};

// RFC 7636: a random verifier and its SHA-256 challenge.
export const createPkcePair = () => {
  const verifier = randomBytes(32).toString('base64url'); // 43 chars
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  return { verifier, challenge };
};
