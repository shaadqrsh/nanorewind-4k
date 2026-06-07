import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getGlobalSupabase } from '../_lib/supabase.js';
import { ensureProfileExists } from '../_lib/profile.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, password } = req.body || {};
  try {
    const { data, error } = await getGlobalSupabase().auth.signInWithPassword({ email, password });

    if (error) return res.status(401).json({ error: error.message });

    // Always ensure profile exists on login, so users from sibling apps in the
    // same project "migrate" purely by logging in.
    if (data.session) {
      await ensureProfileExists(data.session);
    }

    res.json(data);
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: (err as Error).message || 'Login failed' });
  }
}
