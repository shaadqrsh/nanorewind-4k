import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getGlobalSupabase } from '../_lib/supabase';
import { getBearerToken } from '../_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = getBearerToken(req);
  if (token) {
    await getGlobalSupabase().auth.signOut().catch(() => {});
  }
  res.json({ success: true });
}
