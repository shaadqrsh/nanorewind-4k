import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getGlobalSupabase } from '../_lib/supabase';
import { ensureProfileExists } from '../_lib/profile';
import { getBearerToken } from '../_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const token = getBearerToken(req);
  if (!token) return res.status(401).json({ error: 'Missing token' });

  try {
    const { data, error } = await getGlobalSupabase().auth.getUser(token);
    if (error || !data.user) throw new Error('Invalid token');

    // Also ensure here, just in case.
    await ensureProfileExists({ user: data.user, access_token: token });

    res.json({ user: data.user });
  } catch (err) {
    res.status(401).json({ error: 'Invalid session' });
  }
}
