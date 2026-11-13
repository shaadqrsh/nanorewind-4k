// Shared response handling for /api calls.
//
// When the serverless functions aren't running (e.g. `npm run dev` serves only
// the Vite frontend), /api requests come back as an empty 404 or as the SPA's
// index.html. Calling res.json() on those throws a cryptic
// "Unexpected end of JSON input", so detect that case and say what's wrong.

const apiUnreachable = (status: number) =>
  import.meta.env.DEV
    ? `API not reachable (HTTP ${status}). Run the app with \`npx vercel dev\`, not \`npm run dev\`.`
    : `Server not reachable (HTTP ${status}). Please try again shortly.`;

// Fired when a signed-in API call finds the session gone (expired, revoked, or
// signed out elsewhere). App listens for it and returns to the home page.
// /api/auth/* is excluded: a 401 there means wrong credentials, not lost session.
export const SESSION_EXPIRED_EVENT = 'nanorewind:session-expired';

// Parses a JSON body. Throws a readable error if the body isn't JSON.
export const readJson = async <T = any>(res: Response): Promise<T> => {
  if (res.status === 401 && !new URL(res.url, window.location.href).pathname.startsWith('/api/auth/')) {
    window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
  }
  const text = await res.text();
  if (text) {
    try {
      return JSON.parse(text);
    } catch {
      /* fall through: not JSON */
    }
  }
  if (res.ok && !text) return {} as T;
  throw new Error(apiUnreachable(res.status));
};

// An API error that keeps the HTTP status, so callers can react to it
// (402 out of credits, 429 rate limited, ...).
export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

// Parses the body and throws the API's `error` message on non-2xx responses.
export const expectJson = async <T = any>(res: Response, fallback: string): Promise<T> => {
  const data = await readJson<any>(res);
  if (!res.ok) throw new ApiError(data?.error || `${fallback} (HTTP ${res.status})`, res.status);
  return data;
};
