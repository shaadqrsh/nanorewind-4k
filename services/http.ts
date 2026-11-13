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

// Parses a JSON body. Throws a readable error if the body isn't JSON.
export const readJson = async <T = any>(res: Response): Promise<T> => {
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

// Parses the body and throws the API's `error` message on non-2xx responses.
export const expectJson = async <T = any>(res: Response, fallback: string): Promise<T> => {
  const data = await readJson<any>(res);
  if (!res.ok) throw new Error(data?.error || `${fallback} (HTTP ${res.status})`);
  return data;
};
