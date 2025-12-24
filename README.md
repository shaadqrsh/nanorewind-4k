# NanoRewind 4K Setup

Follow these steps to get the application running with Neon Auth and Gemini 3 Pro.

## 1. Neon Database & Auth Setup

1.  Create a project at [Neon.tech](https://neon.tech).
2.  **Enable Auth**: Go to the **Auth** section in the Neon console.
3.  **Database Schema**: Execute this in the Neon SQL Editor:
    ```sql
    CREATE TABLE IF NOT EXISTS users (
      user_id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      credits INTEGER DEFAULT 3,
      last_refill TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    ```

## 2. Configuration

Set these environment variables:

### Backend
*   `DATABASE_URL`: Your Neon Postgres connection string.
*   `API_KEY`: Your Google Gemini API Key.

### Frontend
*   `VITE_NEON_AUTH_URL`: Your Neon Auth project domain (e.g. `https://your-auth-subdomain.neon.tech`).
*   `VITE_BACKEND_URL`: URL of your running backend.

## 3. Local Development

```bash
# Backend
cd backend && npm install && npm start

# Frontend
npm install && npm run dev
```