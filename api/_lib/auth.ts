import type { VercelRequest, VercelResponse } from '@vercel/node';
import { makeScopedClient } from './supabase.js';

type ScopedClient = ReturnType<typeof makeScopedClient>;

export const getBearerToken = (req: VercelRequest): string | null => {
  const authHeader = req.headers['authorization'];
  return (authHeader && authHeader.split(' ')[1]) || null;
};

export interface AuthedContext {
  user: { id: string; email: string | undefined };
  supabase: ScopedClient;
}

// Validates the caller's bearer token and returns a token-scoped client.
// On failure it writes the response and returns null — callers should `return` immediately.
export const requireUser = async (
  req: VercelRequest,
  res: VercelResponse,
): Promise<AuthedContext | null> => {
  const token = getBearerToken(req);
  if (!token) {
    res.status(401).json({ error: 'Missing token' });
    return null;
  }

  try {
    const supabase = makeScopedClient(token);
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw new Error('Invalid token');

    return { user: { id: data.user.id, email: data.user.email }, supabase };
  } catch (err) {
    console.error('Auth error:', err);
    res.status(403).json({ error: 'Auth failed' });
    return null;
  }
};
