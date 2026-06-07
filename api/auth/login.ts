import type { VercelRequest, VercelResponse } from '@vercel/node';
import { globalSupabase } from '../_lib/supabase';
import { ensureProfileExists } from '../_lib/profile';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, password } = req.body || {};
  try {
    const { data, error } = await globalSupabase.auth.signInWithPassword({ email, password });

    if (error) throw error;

    // Always ensure profile exists on login, so users from sibling apps in the
    // same project "migrate" purely by logging in.
    if (data.session) {
      await ensureProfileExists(data.session);
    }

    res.json(data);
  } catch (err) {
    res.status(401).json({ error: (err as Error).message });
  }
}
