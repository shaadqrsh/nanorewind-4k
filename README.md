<div align="center">

# 🖼️ NanoRewind — 4K Image Restoration

**A free, AI-powered image restoration tool using Google Gemini.**

Restore old, scratched, or blurry photos to crisp 4K in seconds.

<br/>

![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-Serverless-000000?style=for-the-badge&logo=vercel&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Postgres-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white)
![Google Gemini](https://img.shields.io/badge/Google_Gemini-AI-8E75B2?style=for-the-badge&logo=googlegemini&logoColor=white)

</div>

---

## ✨ Features

- 🪄 **Photo restoration** — repair old, scratched, or blurry photos.
- 🎯 **4K output** — full high-resolution restoration.
- 🎞️ **Developer processes** — render results in distinct photographic styles: Standard, Silver Gelatin (B&W), Albumen (sepia), Cyanotype, Lumière Autochrome, and Kodachrome 64.
- 🌗 **Atmospheric modifiers** — optional Chiaroscuro (deeper dramatic shadows) and Matte Emulsion (softened vintage-paper highlights).
- 🔍 **Before / after compare** — drag-to-reveal slider to inspect the restoration against the original.
- 🗄️ **Archive** — every restoration is saved to a private library automatically. Reopen any of them in the compare view, or download, share or delete them.
- 🔗 **Share links** — publish a restoration at `/share/<id>`: a before/after page with link previews. Links are unlisted, not indexed by search engines, and can be turned off at any time.
- 📚 **Batch restores** — drop up to 10 photos and they restore one after another, each saved to the archive. Large photos are shrunk in the browser to fit the upload limit.
- 🎟️ **Daily free credits** — 3 restorations/day, tracked in Supabase.
- 🔒 **Secure by design** — all auth and database logic runs server-side, with no secrets in the browser. Restore, sign-up, login and password-reset requests are rate-limited per client IP.

## 🏗️ Architecture

| Layer | Tech |
| --- | --- |
| **Frontend** | React 19 + Vite, deployed on Vercel |
| **Backend** | Vercel Serverless Functions (Node.js / TypeScript) under `/api`, same-origin with the frontend |
| **Database** | Supabase (Postgres) with strict RLS and RPC-based credit deduction |
| **Storage** | Private Supabase Storage bucket (`nanorewind-plates`), per-user folders, signed URLs |
| **AI** | Google Gemini image model |

## 🚀 Local Development

```bash
npm install
npx vercel dev
```

`vercel dev` serves both the Vite frontend and the `/api/*` serverless functions on a single localhost port. Create a `.env` (or run `vercel env pull`) with:

| Variable | Description |
| --- | --- |
| `GEMINI_API_KEY` | Your Google Gemini API key |
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_ANON_KEY` | Your Supabase anon key |
| `GITHUB_OAUTH_ID`, `GITHUB_OAUTH_SECRET` | Only for the Decap CMS login proxy under `/api/decap` |
| `DECAP_ALLOWED_ORIGINS` | Comma-separated sites allowed to use that proxy, e.g. `https://my-portfolio.vercel.app`. If it's unset, the proxy refuses to run. |

> [!NOTE]
> Plain `npm run dev` runs the frontend only — the `/api` routes require `vercel dev` (or a Vercel deployment).

The landing page features an auto-sweeping before/after demo. Swap in your own example by replacing [`public/showcase/before.png`](public/showcase/before.png) and [`public/showcase/after.png`](public/showcase/after.png) (use the same dimensions for the cleanest reveal).

## 📦 Deployment

### 1. Database (Supabase)

1. Create a project at [supabase.com](https://supabase.com).
2. Run the SQL from [`backend/supabase_schema.sql`](backend/supabase_schema.sql) in the SQL Editor. It also creates the private `nanorewind-plates` storage bucket and its policies. The script is idempotent, so on an existing project you can re-run the whole file to add the archive.

### 2. App + API (Vercel)

1. Import the repository to Vercel — it auto-detects Vite, and the `/api` folder deploys as serverless functions.
2. Under **Settings → Environment Variables**, set `GEMINI_API_KEY`, `SUPABASE_URL`, and `SUPABASE_ANON_KEY` for Production and Preview. Tick **Development** too, so `vercel env pull` can fetch them for local `vercel dev`. Otherwise the API fails with "missing SUPABASE_URL or SUPABASE_ANON_KEY".

> [!IMPORTANT]
> These are server-side variables for the functions — do **not** prefix them with `VITE_`, which would expose them to the browser bundle.

### Keep-alive

A GitHub Actions workflow ([`.github/workflows/keep_alive.yml`](.github/workflows/keep_alive.yml)) calls a small `ping()` database function hourly to keep the free-tier database from pausing. It requires `SUPABASE_URL` and `SUPABASE_ANON_KEY` as repository **Actions secrets**.

## 🔒 Security

What the code enforces:

- **Secrets stay on the server.** The browser only talks to `/api`, and no keys are in the frontend bundle.
- **Data isolation.** Postgres RLS and least-privilege grants limit every user to their own profile, archive rows and storage folder. Credits only change through `deduct_credits()`.
- **Rate limits** per client IP on restore, sign-up, login and password reset (see `api/_lib/rateLimit.ts`).
- **Security headers** in `vercel.json`, including a strict Content Security Policy that only allows scripts from this site.
- **Sessions live in HttpOnly cookies** (`Secure`, `SameSite=Strict`, scoped to `/api`), so page scripts can't read the tokens. The server renews expired sessions itself, and state-changing requests from other sites are rejected. Sign-out revokes the session in Supabase. See `api/_lib/cookies.ts` and `api/_lib/auth.ts`.
- **Email links use PKCE.** Confirmation and password-reset links carry a one-time code rather than tokens, and only complete sign-in in the browser that requested them.

Settings to check in dashboards, because code can't enforce these:

- **Supabase → Authentication → URL Configuration:** set Site URL to your production URL, and list only your own domains under Redirect URLs. Include preview domains (e.g. `https://*-yourteam.vercel.app/**`) if you test email links on previews. Keep the default email templates (they use `{{ .ConfirmationURL }}`, which works with PKCE).
- **Supabase → Authentication → Providers → Email:** keep "Confirm email" on, and turn on "Secure password change". Turn on leaked-password protection if your plan has it.
- **Google Cloud → APIs & Services → Credentials:** restrict the Gemini key to the Generative Language API, and set a budget alert.
- **Vercel → Environment Variables:** set `DECAP_ALLOWED_ORIGINS` before relying on the CMS login proxy.
