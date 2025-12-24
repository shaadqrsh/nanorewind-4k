# NanoRewind 4K

AI-powered image restoration application using Gemini 3 Pro and Neon Postgres.

## 1. Database Setup (Neon)

1.  Create a free project at [Neon.tech](https://neon.tech).
2.  Open the **SQL Editor** in the Neon console.
3.  Execute the contents of `backend/neon_schema.txt`.
4.  Copy your **Connection String** (Pooled connection recommended).

## 2. Backend Deployment (Hugging Face Spaces)

1.  Create a new Space on Hugging Face (Docker SDK).
2.  Upload `backend/` files.
3.  Set Secrets in Space Settings:
    *   `DATABASE_URL`: Your Neon Connection String.
    *   `API_KEY`: Your Google Cloud API Key (Gemini enabled).
    *   `JWT_SECRET`: A long random string for token signing.

## 3. Frontend Deployment (Vercel)

1.  Import the root directory into Vercel.
2.  Set `VITE_BACKEND_URL` to your Hugging Face Space URL.

## Local Development

```bash
cd backend
npm install
# Add .env with DATABASE_URL, API_KEY, JWT_SECRET
npm start
```