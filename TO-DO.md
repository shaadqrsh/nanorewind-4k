# 🛠️ NanoRewind 4K — Future Features & Implementation Roadmap

This document serves as a guide for implementing new features and enhancements for NanoRewind, maintaining its premium **dark-room/atelier** aesthetic (graphite/ink palette, amber accents, and vintage photography terminology).

---

## 📅 Roadmap Overview

1. [ ] **[Phase 1] The Plate Archive (Restoration Library)**
2. [ ] **[Phase 2] The Atelier Entrance (Landing Page)**
3. [ ] **[Phase 3] API Rate-Limiting Decorator**
4. [ ] **[Phase 4] Suggested Enhancements (Batching, Sharing, Fine-Tuning)**

---

## 📦 Detailed Feature Breakdowns

### 1. 🎞️ The Plate Archive (Restoration Library)
**Goal:** Allow users to save, browse, download, and delete their previous restorations. Clicking an archived item should reload the original/restored slider for detailed inspection.

#### **Database & Storage (Supabase)**
- [ ] **Create Database Table:** Define a schema migration for the `restorations` table in Supabase.
  ```sql
  CREATE TABLE IF NOT EXISTS "nanorewind-4k".restorations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES "nanorewind-4k".profiles(user_id) ON DELETE CASCADE,
    original_url TEXT NOT NULL,  -- URL to Supabase Storage bucket
    restored_url TEXT NOT NULL,  -- URL to Supabase Storage bucket
    prompt TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );
  ALTER TABLE "nanorewind-4k".restorations ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "Users can manage their own restorations" 
    ON "nanorewind-4k".restorations 
    FOR ALL USING (auth.uid() = user_id);
  ```
- [ ] **Configure Storage Bucket:** Create a Supabase Storage bucket named `plates` or `restorations` with folder restrictions (`/user_id/*`) to ensure privacy and security.

#### **Backend Endpoints (`/api/*`)**
- [ ] **Update `/api/restore.ts`:**
  - After receiving the base64 restored image from Google Gemini, upload both the original image and restored image to Supabase Storage.
  - Insert a record into the `"nanorewind-4k".restorations` table using the authenticated user's ID and public storage URLs.
- [ ] **Add `/api/restorations/list.ts` (GET):** Retrieve all restorations for the authenticated user, sorted by `created_at DESC`.
- [ ] **Add `/api/restorations/delete.ts` (DELETE):** Delete a record from the database and remove the associated assets from Supabase Storage.

#### **Frontend UI & State**
- [ ] **Create `ArchiveView.tsx` Component:**
  - Design a grid overlay or sidebar panel representing the "Atelier Vault".
  - Show compact before/after thumbnails with restoration dates and applied treatment labels.
- [ ] **Integrate History Selection:** Clicking a vault thumbnail should load its URLs into the main `RestoredView` component, restoring the slider/comparison modes.
- [ ] **Add Archive Actions:** Add options to download, delete, or share the archived image directly from the grid.

---

### 2. 🏛️ The Atelier Entrance (Landing Page)
**Goal:** Create a stunning, high-conversion landing page to showcase NanoRewind's capabilities before prompting visitors to sign up or log in.

#### **UI/UX & Interactive Elements**
- [ ] **Hero Section:** A minimalist, premium header displaying:
    - *"Restore history to 4K. Old, scratched, or faded memories developed in seconds."*
    - Sleek hover micro-animations and typography (e.g., Outfit or Inter).
- [ ] **Interactive Demo Slider:**
  - A preloaded, high-resolution before/after example using the interactive `RestoredView` slider component. Users should be able to slide and preview the AI's power instantly without logging in.
- [ ] **Features Grid:** Highlighting:
  - 🪄 **Scratch Repair** — Erasing cracks, tears, and dust.
  - 🎨 **Chrominance Correction** — Automatic color balances.
  - 🎯 **4K Resolution** — High-definition upscaling.
  - ⏳ **Atelier Limits** — 3 free credits daily.
- [ ] **Call to Action (CTA):** Prominent buttons ("Enter the Atelier", "Restore a Photo") that seamlessly route the user to the Sign-up / Login screen.

#### **Implementation Details**
- [ ] **Routing / View State:**
  - Update `App.tsx` state to support three main screens: `'landing' | 'auth' | 'app'`.
  - If the user is unauthenticated, default to the `'landing'` state instead of prompting immediately with the auth screen.
- [ ] **SEO Optimization:**
  - Add descriptive titles, meta descriptions, and OpenGraph tags (for previews on Discord, Twitter, and iMessage).

---

### 3. 🛡️ API Rate-Limiting Decorator
**Goal:** Prevent abuse of costly AI processing (`/api/restore.ts`) and auth endpoints (`/api/auth/signup`) by implementing a rate-limiting wrapper.

#### **Mechanism Selection**
- **Option A (Postgres-Backed Sliding Window):** Keep everything within the existing Supabase instance by creating a simple rate-limit hits table:
  ```sql
  CREATE TABLE IF NOT EXISTS "nanorewind-4k".rate_limits (
    ip TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    window_start TIMESTAMP WITH TIME ZONE NOT NULL,
    request_count INTEGER DEFAULT 1,
    PRIMARY KEY (ip, endpoint, window_start)
  );
  ```
- **Option B (Upstash Redis):** Use Upstash Redis via `@upstash/ratelimit` for ultra-fast, stateless rate-limiting suitable for serverless edge functions.

#### **Decorator Implementation (`api/_lib/rateLimit.ts`)**
- [ ] **Create Higher-Order Function:**
  ```typescript
  import type { VercelRequest, VercelResponse, VercelApiHandler } from '@vercel/node';

  export function withRateLimit(handler: VercelApiHandler, options: { limit: number; windowMs: number }) {
    return async (req: VercelRequest, res: VercelResponse) => {
      const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
      const endpoint = req.url || 'default';
      
      // 1. Check rate limit database/cache
      // 2. Increment request count
      // 3. If count > limit, return res.status(429).json({ error: 'Too many requests' })
      // 4. Attach headers: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset
      
      return handler(req, res);
    };
  }
  ```
- [ ] **Apply to Endpoints:**
  - Wrap `/api/restore.ts` to limit IP-based requests (e.g., max 5 requests per 10 minutes to mitigate bulk uploads/bots).
  - Wrap `/api/auth/signup.ts` to mitigate brute force account creation (e.g., max 3 signups per hour per IP).

---

## 💡 Recommended Feature Suggestions (Aesthetic & Value Add)

### 🌟 4. Public Share Links & Galleries
- **Concept:** Let users "publish" a restored photo. Generates a public shareable URL (e.g. `/share/[id]`) showing the before/after slider view with customized SEO meta-tags.
- **Why:** Encourages organic virality. When users show off their restored family photos, they share the link, bringing new traffic to the app.

### 🌟 5. Fine-Tuning Treatment Drawer (Post-Restoration Adjustments)
- **Concept:** A drawer with CSS filters and AI prompt modifiers.
- **Why:** Sometimes the AI gets color or brightness slightly wrong. Allowing users to tweak brightness, contrast, exposure, or apply a "Vintage Sepia" or "Black & White" filter directly in the browser after restoration adds high utility.

### 🌟 6. Batch Restoration Queue
- **Concept:** Drag and drop multiple photos into the tray. They queue up and process sequentially, updating a progress bar for each "plate".
- **Why:** Dramatically improves the UX for users who want to restore entire albums.

### 🌟 7. Stripe Checkout (Credits Refill)
- **Concept:** Integrates a basic payment gateway to purchase "exposures/credits" beyond the free 3 daily credits (e.g., $5 for 20 restorations).
- **Why:** Transforms the hobby app into a micro-SaaS and covers Gemini API costs.
