import type { VercelRequest, VercelResponse } from '../_lib/vercel.js';
import { getAuthConfig } from '../_lib/supabase.js';
import { blockCrossSite, resolveSession } from '../_lib/auth.js';
import { clearSessionCookies } from '../_lib/cookies.js';

// Revokes the session on the Supabase side (so a copied token stops working)
// and deletes the session cookies.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!blockCrossSite(req, res)) return;

  try {
    // Renews an expired access token first if needed: revoking requires one.
    const session = await resolveSession(req, res);
    if (session) {
      const { url, anonKey } = getAuthConfig();
      await fetch(`${url}/auth/v1/logout?scope=local`, {
        method: 'POST',
        headers: { apikey: anonKey, Authorization: `Bearer ${session.token}` },
      });
    }
  } catch (err) {
    console.error('Logout revoke failed:', err);
  }

  clearSessionCookies(res);
  res.json({ success: true });
}
