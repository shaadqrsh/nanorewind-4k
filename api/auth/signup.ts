import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getGlobalSupabase } from '../_lib/supabase.js';
import { ensureProfileExists } from '../_lib/profile.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, password, name, redirectTo } = req.body || {};
  try {
    const { data, error } = await getGlobalSupabase().auth.signUp({
      email,
      password,
      options: {
        data: { name },
        emailRedirectTo: redirectTo,
      },
    });

    if (error) throw error;

    // If auto-confirm is on, we get a session immediately. Initialize profile.
    if (data.session) {
      await ensureProfileExists(data.session);
    }

    res.json(data);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
}
