import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getGlobalSupabase } from '../_lib/supabase.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, redirectTo } = req.body || {};
  if (!email) return res.status(400).json({ error: 'Email is required' });

  try {
    const { error } = await getGlobalSupabase().auth.resetPasswordForEmail(email, { redirectTo });
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
}
