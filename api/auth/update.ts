import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAuthConfig } from '../_lib/supabase.js';
import { getBearerToken } from '../_lib/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = getBearerToken(req);
  if (!token) return res.status(401).json({ error: 'Missing token' });

  const { name, password } = req.body || {};
  const updates: { data?: { name: string }; password?: string } = {};
  if (name !== undefined) updates.data = { name };
  if (password !== undefined) updates.password = password;

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No updates provided' });
  }

  try {
    // Update the user directly via the GoTrue REST endpoint, authenticated by
    // the caller's bearer token. supabase-js's auth.updateUser() can't be used
    // here because it requires a stored session (it ignores the Authorization
    // header), which a stateless serverless client doesn't have.
    const { url, anonKey } = getAuthConfig();
    const r = await fetch(`${url}/auth/v1/user`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        apikey: anonKey,
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(updates),
    });

    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      throw new Error((data as { msg?: string; error_description?: string }).msg
        || (data as { error_description?: string }).error_description
        || 'Update failed');
    }

    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
}
