import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireUser } from './_lib/auth.js';
import { calculateCredits, Profile } from './_lib/profile.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const ctx = await requireUser(req, res);
  if (!ctx) return;

  try {
    const { data: profile, error } = await ctx.supabase
      .from('profiles')
      .select('*')
      .eq('user_id', ctx.user.id)
      .single();

    if (error || !profile) {
      return res.status(500).json({ error: 'Profile not found' });
    }

    const { currentCredits, nextReset } = calculateCredits(profile as Profile);
    res.json({ allowed: currentCredits > 0, remaining: currentCredits, nextReset });
  } catch (err) {
    console.error('Quota error:', err);
    res.status(500).json({ error: 'Quota fetch failed' });
  }
}
