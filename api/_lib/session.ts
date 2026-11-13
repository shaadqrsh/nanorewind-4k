// What the browser receives about a session. Never a token: the access and
// refresh tokens only travel in HttpOnly cookies (see cookies.ts).
interface UserLike {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
}

export const publicUser = (user: UserLike) => ({
  id: user.id,
  email: user.email ?? null,
  user_metadata: { name: user.user_metadata?.name ?? null },
});

export const publicAuthResult = (
  session: { expires_at?: number } | null,
  user: UserLike | null,
) => ({
  session: session ? { expires_at: session.expires_at ?? null } : null,
  user: user ? publicUser(user) : null,
});
