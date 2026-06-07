import type { VercelRequest, VercelResponse } from '@vercel/node';
import { makeScopedClient } from '../_lib/supabase.js';
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
    // Scope to the caller's token so updateUser acts on the right session.
    const supabase = makeScopedClient(token);
    const { error } = await supabase.auth.updateUser(updates);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
}
