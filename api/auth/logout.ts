import type { VercelRequest, VercelResponse } from '../_lib/vercel.js';
import { getAuthConfig } from '../_lib/supabase.js';
import { getBearerToken } from '../_lib/auth.js';

// Revokes the caller's session on the Supabase side, so a copied token stops
// working at sign-out instead of staying valid until it expires.
// (The old version called signOut() on a shared client with no session, which
// did nothing.)
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = getBearerToken(req);
  if (token) {
    try {
      const { url, anonKey } = getAuthConfig();
      await fetch(`${url}/auth/v1/logout?scope=local`, {
        method: 'POST',
        headers: { apikey: anonKey, Authorization: `Bearer ${token}` },
      });
    } catch (err) {
      console.error('Logout revoke failed:', err);
    }
  }
  res.json({ success: true });
}
