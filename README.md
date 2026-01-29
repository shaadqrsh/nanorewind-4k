# NanoRewind - 4K Image Restoration

A free, AI-powered image restoration tool using Google Gemini.

## Features
- Restore old, scratched, or blurry photos.
- Daily free credit system (3 restorations/day) tracked via Supabase.
- Full 4K restoration capabilities.

## Tech Stack
-   **Frontend**: React, Vite, TailwindCSS, Supabase Auth (via `@supabase/supabase-js`)
-   **Backend**: Node.js, Express, Supabase Admin Client, Google GenAI SDK

## Setup & installation

1.  **Clone the repository**
2.  **Install Dependencies**
    ```bash
    npm install
    cd backend
    npm install
    ```
3.  **Supabase Setup**
    *   Create a new Supabase project.
    *   Navigate to the **SQL Editor** in your Supabase Dashboard.
    *   Run the SQL script found in `supabase_schema.sql` (located in the project root).
        *   This creates the `nanorewind-4k` schema and `profiles` table.
4.  **Environment Variables**
    *   Create a `.env` file in the **root** folder for the frontend:
        ```bash
        VITE_BACKEND_URL=http://localhost:7860
        VITE_SUPABASE_URL=your_supabase_project_url
        VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
        ```
    *   Create a `.env` file in the **backend** folder:
        ```bash
        PORT=7860
        API_KEY=your_google_gemini_api_key
        
        # Supabase Config for Admin Access
        VITE_SUPABASE_URL=your_supabase_project_url
        SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
        ```
        > **Note**: You must use the `SERVICE_ROLE_KEY` (found in Project Settings > API) for the backend to manage the `nanorewind-4k` schema.

## Running the App

1.  **Start the Backend**
    ```bash
    cd backend
    npm start
    ```
2.  **Start the Frontend** (in a new terminal)
    ```bash
    npm run dev
    ```

## Authentication & Database
*   **Users**: Managed by Supabase Auth (email/password).
*   **Data**: User credits and profiles are stored in the `nanorewind-4k` schema in your Supabase DB.
*   **Isolation**: The app strictly uses the `nanorewind-4k` schema to avoid conflicts with other apps in the same project.