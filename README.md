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
- 🎟️ **Daily free credits** — 3 restorations/day, tracked in Supabase.
- 🔒 **Secure by design** — all auth and database logic runs server-side; no secrets in the browser.

## 🏗️ Architecture

| Layer | Tech |
| --- | --- |
| **Frontend** | React 19 + Vite, deployed on Vercel |
| **Backend** | Vercel Serverless Functions (Node.js / TypeScript) under `/api`, same-origin with the frontend |
| **Database** | Supabase (Postgres) with strict RLS and RPC-based credit deduction |
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

> [!NOTE]
> Plain `npm run dev` runs the frontend only — the `/api` routes require `vercel dev` (or a Vercel deployment).

## 📦 Deployment

### 1. Database (Supabase)

1. Create a project at [supabase.com](https://supabase.com).
2. Run the SQL from [`backend/supabase_schema.sql`](backend/supabase_schema.sql) in the SQL Editor.

### 2. App + API (Vercel)

1. Import the repository to Vercel — it auto-detects Vite, and the `/api` folder deploys as serverless functions.
2. Under **Settings → Environment Variables** (Production + Preview), set `GEMINI_API_KEY`, `SUPABASE_URL`, and `SUPABASE_ANON_KEY`.

> [!IMPORTANT]
> These are server-side variables for the functions — do **not** prefix them with `VITE_`, which would expose them to the browser bundle.

### Keep-alive

A GitHub Actions workflow ([`.github/workflows/keep_alive.yml`](.github/workflows/keep_alive.yml)) pings Supabase hourly to keep the free-tier database from pausing. It requires `SUPABASE_URL` and `SUPABASE_ANON_KEY` as repository **Actions secrets**.
