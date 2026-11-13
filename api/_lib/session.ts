// What the browser receives after sign-in or sign-up. Only the short-lived
// access token: the refresh token never leaves the server, so a script running
// in the page can't use it to mint new sessions.
interface SessionLike {
  access_token: string;
  expires_at?: number;
}
interface UserLike {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
}

export const publicAuthResult = (session: SessionLike | null, user: UserLike | null) => ({
  session: session ? { access_token: session.access_token, expires_at: session.expires_at ?? null } : null,
  user: user ? { id: user.id, email: user.email ?? null, user_metadata: { name: user.user_metadata?.name ?? null } } : null,
});
