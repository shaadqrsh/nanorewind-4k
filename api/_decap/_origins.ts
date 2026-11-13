/**
 * Sites allowed to receive GitHub tokens from this Decap OAuth proxy.
 *
 * DECAP_ALLOWED_ORIGINS is a comma-separated list of origins, e.g.
 *   https://my-portfolio.vercel.app,https://www.example.com
 *
 * Without this list, any website could open the proxy in a popup and receive
 * the GitHub token of anyone who has used the CMS before (GitHub skips the
 * consent screen for apps the user already approved). So an empty list means
 * the proxy refuses to run.
 */
export function getAllowedOrigins(): string[] {
  return (process.env.DECAP_ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .flatMap((s) => {
      try {
        return [new URL(s).origin];
      } catch {
        return [];
      }
    });
}

export const NOT_CONFIGURED_MESSAGE =
  'CMS login is disabled: set DECAP_ALLOWED_ORIGINS to the site(s) allowed to use it.';
