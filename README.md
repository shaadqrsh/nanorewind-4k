# NanoRewind - 4K Image Restoration

A free, AI-powered image restoration tool using Google Gemini.

## Features
- Restore old, scratched, or blurry photos.
- Daily free credit system (3 restorations/day) tracked via Supabase.
- Full 4K restoration capabilities.
- **Secure Backend**: All authentication and database logic is handled by the backend proxy.

## Architecture
-   **Frontend**: React (Vite) on **Vercel**.
-   **Backend**: Node.js (Express) on **Hugging Face Spaces**.
-   **Database**: Supabase (Postgres) with strict RLS and RPC functions.

## Local Development

1.  **Backend**:
    ```bash
    cd backend
    npm install
    npm start
    ```
    *   Create `backend/.env` with `API_KEY` (Gemini), `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.

2.  **Frontend**:
    ```bash
    npm install
    npm run dev
    ```
    *   Create `.env` with `VITE_BACKEND_URL=http://localhost:7860`.

## Deployment

### 1. Database (Supabase)
*   Create a project at [supabase.com](https://supabase.com).
*   Run the SQL from `supabase_schema.sql` in the SQL Editor.

### 2. Backend (Hugging Face Spaces)
*   Create a new Space (Node.js template).
*   Upload the contents of the `backend/` folder (ensure `package.json` is at the root of the Space or configure the Space to look in `backend/` if syncing repo). *Typically easier to just copy the backend code to the Space root or use a Dockerfile.*
*   **Settings > Variables / Secrets**:
    *   `API_KEY`: Your Google Gemini API Key.
    *   `VITE_SUPABASE_URL`: Your Supabase Project URL.
    *   `VITE_SUPABASE_ANON_KEY`: Your Supabase Anon Key.
    *   `PORT`: `7860` (Default for HF Spaces).

### 3. Frontend (Vercel)
*   Import the repository to Vercel.
*   **Settings > Environment Variables**:
    *   `VITE_BACKEND_URL`: The direct URL of your Hugging Face Space (e.g., `https://username-spacename.hf.space`).
        *   *Note: Ensure the HF Space is "Public" or you handle auth, usually Public is required for the frontend to hit the API directly.*