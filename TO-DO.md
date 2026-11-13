# 🛠️ NanoRewind 4K — Future Features & Implementation Roadmap

This document serves as a guide for implementing new features and enhancements for NanoRewind, maintaining its premium **dark-room/atelier** aesthetic (graphite/ink palette, amber accents, and vintage photography terminology).

---

## 📅 Roadmap Overview

1. [x] **[Phase 1] The Plate Archive (Restoration Library)**
2. [x] **[Phase 2] The Atelier Entrance (Landing Page)**
3. [ ] **[Phase 3] API Rate-Limiting Decorator** — built, awaiting test
4. [ ] **[Phase 4] Suggested Enhancements (Batching, Sharing, Fine-Tuning)**

---

## 📦 Detailed Feature Breakdowns

### 1. 🎞️ The Plate Archive (Restoration Library)
**Goal:** Allow users to save, browse, download, and delete their previous restorations. Clicking an archived item should reload the original/restored slider for detailed inspection.

#### **Database & Storage (Supabase)** — see `backend/supabase_schema.sql`
- [x] **Create Database Table:** `"nanorewind-4k".restorations` stores storage *paths* (not URLs) plus the structured treatment (`process`, `chiaroscuro`, `matte`) and `original_name`. RLS: select/insert/delete own rows only; inserts must point inside the caller's folder; rows are immutable.
- [x] **Configure Storage Bucket:** private `nanorewind-plates` bucket (namespaced, since the Supabase project is shared), files at `<user_id>/<restoration_id>/{original,restored}.<ext>`, with RLS that confines each user to their own folder. The API hands out 6-hour signed URLs.

#### **Backend Endpoints (`/api/*`)**
- [x] **Update `/api/restore.ts`:** uploads both images and inserts the row after Gemini responds. An archive failure is logged and returns `restoration: null` rather than failing a request the user already spent a credit on. Input is now validated *before* the credit is deducted.
- [x] **Add `/api/restorations.ts`:** `GET` lists newest-first (48 per page, `?before=` cursor) and `DELETE ?id=` removes files and then the row. One file serves both methods to stay under Vercel Hobby's 12-function limit.

#### **Frontend UI & State**
- [x] **Create `ArchiveView.tsx`:** grid overlay opened from the header's Archive button. Split before/after thumbnails (they sweep to "after" on hover), style code chip, date and treatment label, plus skeleton, empty, error and "Load older" states.
- [x] **Integrate History Selection:** clicking a plate loads it into `RestoredView` and restores its original style selection in the left rail.
- [x] **Add Archive Actions:** download (blob-based, because `<a download>` is ignored cross-origin), share (native share sheet with the file, falling back to clipboard copy), and delete with confirmation. Public share links remain Phase 4.

---

### 2. 🏛️ The Atelier Entrance (Landing Page)
**Goal:** Create a stunning, high-conversion landing page to showcase NanoRewind's capabilities before prompting visitors to sign up or log in.

#### **UI/UX & Interactive Elements**
- [x] **Hero Section:** A minimalist, premium header displaying:
    - *"Restore history to 4K. Old, scratched, or faded memories developed in seconds."*
    - Sleek hover micro-animations and typography (e.g., Outfit or Inter).
- [x] **Interactive Demo Slider:**
  - A preloaded, high-resolution before/after example using the interactive `RestoredView` slider component. Users should be able to slide and preview the AI's power instantly without logging in.
- [x] **Features Grid:** Highlighting:
  - 🪄 **Scratch Repair** — Erasing cracks, tears, and dust.
  - 🎨 **Chrominance Correction** — Automatic color balances.
  - 🎯 **4K Resolution** — High-definition upscaling.
  - ⏳ **Atelier Limits** — 3 free credits daily.
- [x] **Call to Action (CTA):** Prominent buttons ("Enter the Atelier", "Restore a Photo") that seamlessly route the user to the Sign-up / Login screen.

#### **Implementation Details**
- [x] **Routing / View State:**
  - Update `App.tsx` state to support three main screens: `'landing' | 'auth' | 'app'`.
  - If the user is unauthenticated, default to the `'landing'` state instead of prompting immediately with the auth screen.
- [x] **SEO Optimization:**
  - Add descriptive titles, meta descriptions, and OpenGraph tags (for previews on Discord, Twitter, and iMessage).

---

### 3. 🛡️ API Rate-Limiting Decorator
**Goal:** Prevent abuse of costly AI processing (`/api/restore.ts`) and auth endpoints (`/api/auth/signup`) by implementing a rate-limiting wrapper.

#### **Implementation** (see `api/_lib/rateLimit.ts` and `backend/supabase_schema.sql`)
- [x] **Mechanism:** Option A (Postgres). The `hit_rate_limit` SECURITY DEFINER function counts and decides in one atomic call, using a sliding-window estimate (previous window weighted, plus the current one). The `rate_limits` table is locked down: RLS on, no policies, grants revoked. Client IPs are stored only as hashes. Old rows are pruned occasionally.
- [x] **Higher-order function:** `withRateLimit(handler, { name, limit, windowMs })`. Buckets are keyed by a fixed `name` rather than `req.url`, because a query string would otherwise get a fresh bucket. Sets `X-RateLimit-*` headers, and on 429 adds `Retry-After` and a readable "Try again in N minutes" message. Fails open if the limiter itself errors.
- [x] **Applied to endpoints:**
  - `/api/restore`: 5 per 10 minutes
  - `/api/auth/signup`: 3 per hour
  - `/api/auth/login`: 10 per 15 minutes (added for brute-force protection)
  - `/api/auth/recover`: 3 per hour (added to stop reset-email spam)

  Login and recover were added because every Supabase auth call comes from Vercel's servers, so Supabase's own per-IP limits can't tell users apart.

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
