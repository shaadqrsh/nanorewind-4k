# NanoRewind 4K

AI-powered image restoration application using Gemini 3 Pro and Supabase.

## Architecture

*   **Frontend**: React (Vercel) - No direct database access.
*   **Backend**: Node.js/Express (Hugging Face Spaces / Docker) - Acts as an Auth Proxy and API Gateway.
*   **Database**: Supabase (PostgreSQL) - Stores user profiles and credits.

## 1. Database Setup (Supabase)

1.  Create a Supabase project.
2.  Go to the **SQL Editor**.
3.  Copy and run the contents of `backend/supabase_schema.txt`. This sets up the profiles table and the secure credit deduction function.

## 2. Backend Deployment (Hugging Face Spaces)

1.  Create a new Space on Hugging Face.
2.  Select **Docker** as the SDK.
3.  Upload the contents of the `backend/` folder (including `Dockerfile`, `package.json`, `index.js`).
4.  Go to **Settings** -> **Variables and secrets** and add:
    *   `SUPABASE_URL`: Your Supabase Project URL.
    *   `SUPABASE_ANON_KEY`: Your Supabase **Anon** Key (Public).
    *   `GEMINI_API_KEY`: Your Google Cloud API Key (Gemini enabled).
    *   *Note: Do not use the Service Role Key.*

## 3. Frontend Deployment (Vercel)

1.  Push the root code to GitHub.
2.  Import project into Vercel.
3.  Set the Environment Variable:
    *   `VITE_BACKEND_URL`: The URL of your Hugging Face Space (e.g., `https://username-space.hf.space`).
    *   *Note: Do not set any Supabase keys here.*

## Local Development

1.  **Backend**:
    ```bash
    cd backend
    npm install
    # Create .env with keys
    npm start
    ```
2.  **Frontend**:
    ```bash
    npm install
    # Create .env with VITE_BACKEND_URL=http://localhost:7860
    npm run dev
    ```
