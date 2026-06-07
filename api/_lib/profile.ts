import { makeScopedClient } from './supabase';

export const MAX_CREDITS = 3;
export const REFILL_MS = 24 * 60 * 60 * 1000;

interface SessionLike {
  user?: { id: string } | null;
  access_token?: string | null;
}

// Ensures the caller has a profile row, creating one on first sight.
// Lets users from sibling apps in the same Supabase project "migrate" by logging in.
export const ensureProfileExists = async (session: SessionLike | null): Promise<void> => {
  if (!session || !session.user || !session.access_token) return;

  try {
    const scopedClient = makeScopedClient(session.access_token);

    const { data: profile, error: fetchErr } = await scopedClient
      .from('profiles')
      .select('user_id')
      .eq('user_id', session.user.id)
      .single();

    if (!profile && (!fetchErr || fetchErr.code === 'PGRST116')) {
      await scopedClient.from('profiles').insert([{ user_id: session.user.id }]);
    }
  } catch (err) {
    console.error('Profile creation failed:', (err as Error).message);
  }
};

export interface Profile {
  credits: number;
  last_refill: string;
}

export function calculateCredits(profile: Profile): {
  currentCredits: number;
  nextReset: number | null;
} {
  const now = Date.now();
  const lastRefill = new Date(profile.last_refill).getTime();
  const elapsed = now - lastRefill;
  const gained = Math.floor(elapsed / REFILL_MS);

  const currentCredits = Math.min(MAX_CREDITS, profile.credits + gained);

  const nextReset =
    currentCredits < MAX_CREDITS ? lastRefill + (gained + 1) * REFILL_MS : null;

  return { currentCredits, nextReset };
}
