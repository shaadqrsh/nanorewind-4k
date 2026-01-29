# Migration Checklist: Backend-Only Auth

The architecture has been updated so that the Frontend **does not** need Supabase keys or SDKs. All logic is in the Backend.

## 1. Environment Variables Cleanup

### Frontend (`e:\Work\Web Projects\nanorewind-4k\.env`)
You can now **remove** the Supabase keys from the frontend `.env`. It only needs the backend URL.

```env
VITE_BACKEND_URL=http://localhost:7860
# DELETE THESE:
# VITE_SUPABASE_URL=...
# VITE_SUPABASE_ANON_KEY=...
```

### Backend (`e:\Work\Web Projects\nanorewind-4k\backend\.env`)
Ensure your backend has the anonymous key.

```env
PORT=7860
API_KEY=...
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

## 2. Install Dependencies
We removed `@supabase/supabase-js` from the frontend.

1.  **Frontend**:
    ```bash
    npm install
    ```
    *(This will remove the rewritten dependency)*

## 3. Run the App
1.  **Start Backend**: `cd backend && npm start`
2.  **Start Frontend**: `npm run dev`

## 4. Verify
1.  **Login/Signup**: Test the flow. The network tab should show requests to `http://localhost:7860/api/auth/login` instead of Supabase directly.
2.  **Restore**: Should work as before, but the token passed is verified by the backend against Supabase.
