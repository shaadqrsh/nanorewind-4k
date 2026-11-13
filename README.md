# NanoRewind 4K

A free web app that restores old family photos with Google Gemini. It repairs scratches, tears and faded color, and keeps every result in a private album.

Live at [nanorewind-4k.vercel.app](https://nanorewind-4k.vercel.app).

Built with React 19, TypeScript, Vite and Tailwind CSS on the front end, Vercel serverless functions for the API, Supabase for auth, Postgres and storage, and the Gemini image model for the restorations.

## Features

- Restores old, scratched or blurry photos. Results come out at about one megapixel (for example 1024 × 1024). "4K" is the brand name; true 4K output is planned for a paid tier.
- Six photographic processes to render the result in: Standard, Silver Gelatin (black and white), Albumen (sepia), Cyanotype, Lumière Autochrome and Kodachrome 64.
- Two optional modifiers. Chiaroscuro deepens the shadows, and Matte Emulsion softens the highlights like old paper.
- Three ways to compare the result with the original: a loupe that magnifies the restored photo over the original, a drag-to-reveal slider, and side by side.
- A private album. Every restoration is saved there automatically, and you can reopen any of them in the workspace, download, share or delete them.
- Share links at `/share/<id>`. Each one is a before/after page with its own generated preview card (the before and after held in photo corners). Links are unlisted, kept out of search engines, and can be turned off at any time.
- Batch restores. Drop up to 10 photos and they restore one after another, each saved to the album. The browser shrinks large photos to fit the upload limit.
- Free credits. Every account holds up to 3, and one more comes back every 24 hours. Supabase tracks them.
- Privacy, terms and cookie pages, prerendered as static HTML. Sign-up asks you to confirm you're 18 or older. The browser strips photo metadata (GPS location and the like) before upload, and Settings has a "Delete all my photos" button. There are no analytics, ads or third-party fonts.
- All auth and database logic runs on the server, so the browser holds no secrets. Restore, sign-up, login and password reset are rate-limited per client IP.

## Architecture

| Layer | Tech |
| --- | --- |
| Frontend | React 19 and Vite, deployed on Vercel |
| Backend | Vercel Serverless Functions (Node.js, TypeScript) under `/api`, on the same origin as the frontend |
| Database | Supabase Postgres with strict RLS and an RPC that deducts credits |
| Storage | A private Supabase Storage bucket (`nanorewind-plates`) with per-user folders and signed URLs |
| AI | Google Gemini image model |
| Share cards | satori and resvg-wasm, rendered in `api/share.ts` |

## Local development

```bash
npm install
npx vercel dev
```

`vercel dev` serves the Vite frontend and the `/api/*` serverless functions on one localhost port. Create a `.env` (or run `vercel env pull`) with:

| Variable | Description |
| --- | --- |
| `GEMINI_API_KEY` | Your Google Gemini API key |
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_ANON_KEY` | Your Supabase anon key |
| `GITHUB_OAUTH_ID`, `GITHUB_OAUTH_SECRET` | Only needed for the Decap CMS login proxy under `/api/decap` |
| `DECAP_ALLOWED_ORIGINS` | Comma-separated sites allowed to use that proxy, e.g. `https://my-portfolio.vercel.app`. The proxy refuses to run if this is unset. |

Plain `npm run dev` runs only the frontend. The `/api` routes need `vercel dev` or a Vercel deployment.

The landing page shows a real restoration as a before/after album spread. To use your own example, replace [`public/showcase/before.png`](public/showcase/before.png) and [`public/showcase/after.png`](public/showcase/after.png). Square images work best.

The UI uses Young Serif and Atkinson Hyperlegible, both under the SIL Open Font License. The site serves its own WOFF2 copies from [`public/fonts/`](public/fonts/) and makes no Google Fonts requests. TTF copies for the share-card renderer live in [`api/_lib/fonts/`](api/_lib/fonts/). Both folders include the licenses.

### Pages, metadata and policies

- Every page has its own address: `/`, `/signin`, `/signup`, `/album`, `/privacy`, `/terms` and `/cookies`. Titles, descriptions and canonical links come from `PAGE_META` in [`utils/routes.ts`](utils/routes.ts).
- `npm run build` writes one HTML file per page with its own head tags, prerenders the policy pages to static HTML that needs no JavaScript, and generates `sitemap.xml`. The plugin is in [`vite.config.ts`](vite.config.ts). Vercel's `cleanUrls` serves `/privacy` from `privacy.html`.
- The policy text is in [`components/legal/`](components/legal/). The operator, location, contact and "last updated" date are in [`utils/site.ts`](utils/site.ts). Update `POLICIES_UPDATED` whenever a policy changes.
- `public/robots.txt` and `public/llms.txt` are static files. The production URL is `SITE_URL` in `utils/site.ts`. If you move to a custom domain, change it there, in those two files and in the JSON-LD in `index.html`.

## Deployment

### 1. Database (Supabase)

1. Create a project at [supabase.com](https://supabase.com).
2. Run [`backend/supabase_schema.sql`](backend/supabase_schema.sql) in the SQL Editor. It also creates the private `nanorewind-plates` storage bucket and its policies. The script is idempotent, so you can re-run the whole file on an existing project.

### 2. App and API (Vercel)

1. Import the repository into Vercel. It detects Vite, and the `/api` folder deploys as serverless functions.
2. Under Settings, Environment Variables, set `GEMINI_API_KEY`, `SUPABASE_URL` and `SUPABASE_ANON_KEY` for Production and Preview. Tick Development as well so `vercel env pull` can fetch them for `vercel dev`. Without them the API fails with "missing SUPABASE_URL or SUPABASE_ANON_KEY".

These are server-side variables for the functions. Don't prefix them with `VITE_`, because that would put them in the browser bundle.

### Keep-alive

A GitHub Actions workflow ([`.github/workflows/keep_alive.yml`](.github/workflows/keep_alive.yml)) calls a small `ping()` database function every hour so the free-tier database doesn't pause. It needs `SUPABASE_URL` and `SUPABASE_ANON_KEY` as repository Actions secrets.

## Security

The code enforces the following:

- The browser only talks to `/api`, and the frontend bundle contains no keys.
- Postgres RLS and least-privilege grants limit every user to their own profile, album rows and storage folder. Credits only change through `deduct_credits()`.
- Restore, sign-up, login and password reset are rate-limited per client IP (see `api/_lib/rateLimit.ts`).
- `vercel.json` sets security headers, including a strict Content Security Policy on every page that only allows scripts, styles and fonts from this site.
- Sessions live in HttpOnly cookies (`Secure`, `SameSite=Strict`, scoped to `/api`), so page scripts can't read the tokens. The server renews expired sessions itself and rejects state-changing requests from other sites. Signing out revokes the session in Supabase. See `api/_lib/cookies.ts` and `api/_lib/auth.ts`.
- Confirmation and password reset emails use PKCE. The links carry a one-time code instead of tokens and only complete sign-in in the browser that requested them.

Code can't enforce these dashboard settings, so check them yourself:

- Supabase, Authentication, URL Configuration: set Site URL to your production URL and list only your own domains under Redirect URLs. Add preview domains (e.g. `https://*-yourteam.vercel.app/**`) if you test email links on previews. Keep the default email templates; they use `{{ .ConfirmationURL }}`, which works with PKCE.
- Supabase, Authentication, Providers, Email: keep "Confirm email" on and turn on "Secure password change". Turn on leaked-password protection if your plan has it.
- Google Cloud, APIs & Services, Credentials: restrict the Gemini key to the Generative Language API and set a budget alert.
- Vercel, Environment Variables: set `DECAP_ALLOWED_ORIGINS` before relying on the CMS login proxy.
