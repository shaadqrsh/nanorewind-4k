# NanoRewind 4K

Restore and enhance old photographs using the Gemini Nano Banana model with Neon Auth.

## Setup Instructions

### 1. Neon Database & Auth
1.  Create a project at [Neon.tech](https://neon.tech).
2.  **Enable Auth**: Go to the **Auth** section in the Neon console.
3.  **Database Schema**: Execute this in the Neon SQL Editor:
    ```sql
    CREATE TABLE IF NOT EXISTS users (
      user_id TEXT PRIMARY KEY,
      credits INTEGER DEFAULT 3,
      last_refill TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    ```
    *Note: User profile data (email, name) is managed entirely by Neon Auth.*

### 2. Deployment Configuration
This application consists of a Node.js backend and a React frontend.

**Backend Environment Variables:**
*   `DATABASE_URL`: Your Neon Postgres connection string.
*   `API_KEY`: Your Google Gemini API Key.
*   `NEON_AUTH_URL`: Your Neon Auth project domain (e.g. `https://your-auth-subdomain.neon.tech`).

**Frontend Environment Variables:**
*   `VITE_BACKEND_URL`: The URL where your backend is deployed.

### 3. Build & Run
To deploy, build the frontend and serve it, or host frontend and backend separately.

```bash
# Backend
cd backend && npm install && npm start

# Frontend
npm install && npm run build
```