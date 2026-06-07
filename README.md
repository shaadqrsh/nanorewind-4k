# NanoRewind - 4K Image Restoration

A free, AI-powered image restoration tool using Google Gemini.

## Features
- Restore old, scratched, or blurry photos.
- Daily free credit system (3 restorations/day) tracked via Supabase.
- Full 4K restoration capabilities.
- **Secure Backend**: All authentication and database logic is handled by serverless API routes.

## Architecture
-   **Frontend**: React (Vite) on **Vercel**.
-   **Backend**: Vercel **Serverless Functions** (Node.js/TypeScript) under `/api`, same-origin with the frontend.
-   **Database**: Supabase (Postgres) with strict RLS and RPC functions.

## Local Development

```bash
npm install
npx vercel dev
```

`vercel dev` serves both the Vite frontend and the `/api/*` serverless functions on a single localhost port. Create a `.env` (or use `vercel env pull`) with:

-   `GEMINI_API_KEY` — your Google Gemini API key.
-   `SUPABASE_URL` — your Supabase project URL.
-   `SUPABASE_ANON_KEY` — your Supabase anon key.

> Plain `npm run dev` runs the frontend only; the `/api` routes require `vercel dev` (or a Vercel deployment).

## Deployment

### 1. Database (Supabase)
*   Create a project at [supabase.com](https://supabase.com).
*   Run the SQL from `backend/supabase_schema.sql` in the SQL Editor.

### 2. App + API (Vercel)
*   Import the repository to Vercel (it auto-detects Vite; the `/api` folder deploys as serverless functions).
*   **Settings > Environment Variables** (Production + Preview):
    *   `GEMINI_API_KEY` — your Google Gemini API key.
    *   `SUPABASE_URL` — your Supabase project URL.
    *   `SUPABASE_ANON_KEY` — your Supabase anon key.

> These are server-side variables for the functions — do **not** prefix them with `VITE_` (that would expose them to the browser bundle).

### Keep-alive
A GitHub Actions workflow (`.github/workflows/keep_alive.yml`) pings Supabase hourly to keep the free-tier database from pausing. It requires `SUPABASE_URL` and `SUPABASE_ANON_KEY` as repository Actions secrets.
