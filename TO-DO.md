# 🛠️ NanoRewind 4K — Future Features & Implementation Roadmap

This document serves as a guide for implementing new features and enhancements for NanoRewind, in its **family album** look (oxblood album pages, prints held in photo corners, brass accents, Young Serif and Atkinson Hyperlegible).

---

## 📅 Roadmap Overview

1. [x] **[Phase 1] The Plate Archive (Restoration Library)**
2. [x] **[Phase 2] The Atelier Entrance (Landing Page)**
3. [x] **[Phase 3] API Rate-Limiting Decorator** (plus a security audit)
4. [x] **[Phase 4] Suggested Enhancements (Sharing, Batching)**
5. [ ] **[Phase 5] UI Redesign (Anti-Pattern Checklist)** (built, awaiting test)
6. [ ] **[Phase 6] Compliance, SEO & Accessibility**
7. [ ] **[Phase 7] Paid Features (Stripe & Custom Domain)**
8. [ ] **[Phase 8] Fine-Tuning Treatment Drawer** (moved from the suggested enhancements)

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

#### **Security audit** (added during this phase)
- [x] **Decap CMS proxy:** fixed a token leak. Any website could receive a CMS user's GitHub token; it now goes only to `DECAP_ALLOWED_ORIGINS`.
- [x] **Database:** least-privilege grants (`anon` has no table access; profile inserts are limited to `user_id`); a `ping()` function for the keep-alive job.
- [x] **Sessions in HttpOnly cookies:** `Secure`, `SameSite=Strict`, scoped to `/api`; renewed server-side; revoked on sign-out; origin check on every state-changing request.
- [x] **Email links use PKCE:** links carry a one-time code instead of tokens, and only work in the browser that requested them. Password reset now ends with a "Choose a new password" step (it previously had none).
- [x] **Headers:** strict CSP and standard security headers in `vercel.json`. Tailwind moved from a runtime CDN script to the build.
- [x] **Input checks:** auth endpoints validate input; email redirect links must point back to this site; uploads must really be images.
- [x] **Dependencies:** 23 advisories down to 0 (`@vercel/node` replaced by local types). Stale `changes.md` and `metadata.json` removed.
- [x] **Git history:** checked for leaked secrets; none found.

---

## 💡 Recommended Feature Suggestions (Aesthetic & Value Add)

### 🌟 4. Public Share Links & Galleries
- **Concept:** Let users "publish" a restored photo. Generates a public shareable URL (e.g. `/share/[id]`) showing the before/after slider view with customized SEO meta-tags.
- **Why:** Encourages organic virality. When users show off their restored family photos, they share the link, bringing new traffic to the app.
- [x] **Share links:**
  - "Share" in the archive and on the result opens a dialog to create, copy or turn off a link. Each link is 16 random characters; turning it off kills it, and sharing again makes a new one.
  - `/share/<id>` is a server-rendered page (`api/share.ts`, with `public/share-viewer.*`) with a before/after slider and link-preview tags. It's `noindex`, sends no `Referer`, and never shows the owner or the file name.
  - Database: `share_id` column plus `set_restoration_share`, `get_shared_restoration` and an anon-only storage rule for shared files only. Image links are 10-minute signed URLs.
- [ ] **Public gallery:** not built on purpose. These are often family photos, so links stay unlisted.

### 🌟 6. Batch Restoration Queue
- **Concept:** Drag and drop multiple photos into the tray. They queue up and process sequentially, updating a progress bar for each "plate".
- **Why:** Dramatically improves the UX for users who want to restore entire albums.
- [x] **Batch queue:**
  - Drop or pick up to 10 photos. They restore one at a time with a status per photo (waiting, restoring with a progress bar, done, failed, no credits left), and each result goes to the archive.
  - Credits cap it: when they run out, the rest are marked "No credits left" and the next run retries them. "Stop after this photo" pauses a batch.
  - Photos over 3 MB are shrunk in the browser (longest side 3072px) to fit Vercel's 4.5 MB request limit. This also fixes single uploads of large phone photos, which used to fail.

---

### 7. 🎨 UI Redesign (Anti-Pattern Checklist)
**Goal:** Redesign the UI without falling into generic, templated "AI-generated site" patterns. Check each item off once the redesign is confirmed free of it.

#### **What was built**
- [x] **Direction:** the "Album" mockup, picked from three, with the light-table mockup's view modes. Oxblood album pages (`index.css` holds the palette as CSS variables), prints held in photo corners (the `.mount` class), Young Serif headings and Atkinson Hyperlegible text. "NanoRewind 4K" is the wordmark; the copy says "high resolution" instead of claiming 4K output.
- [x] **Workspace:** the photo on the left, a settings panel on the right (photo or batch list, a 3x2 style grid that previews your own photo, extras, the restore button). After a result the button offers "Restore again" or "Restore in sepia", which also works for photos reopened from the album. Results show in three modes: **Loupe** (a 2.4x lens of the restored photo over the original), **Slider** and **Side by side** (with pixel sizes). The chosen mode is remembered.
- [x] **Album:** the archive is now its own view at `#album` (Back works), with mounted prints, captions, text actions, loading placeholders and an empty slot that starts a new restore.
- [x] **Everything else:** landing page, sign in and sign up (with a breadcrumb), share dialog, settings, new password, sign out and out-of-credits dialogs, all on one `Modal` shell. Account menu in the header.
- [x] **Share page:** restyled, with breadcrumbs and a generated 1200x630 preview card per link (`api/_lib/shareCard.ts`, satori + resvg). If the card can't be drawn, the link preview falls back to the restored photo.
- [x] **Assets:** `og-card.jpg` for the landing page, a favicon set (SVG, ICO, PNG sizes, Apple touch icon, maskable icon, web manifest) and `public/404.html`.
- [x] **Fixed on the way:** "Add more photos" with a single extra photo replaced the open photo instead of starting a batch.

#### **Color & Surfaces**
- [x] No harsh gradients
- [x] No pure white (`#fff`) background
- [x] No rainbow coloring
- [x] No purple-and-black palette
- [x] No neon colors
- [x] No basic pastel colors
- [x] No colored accent stripe on cards (the selected batch row and style use an outline instead)
- [x] No liquid glass / glassmorphism (dialog backdrops are a solid scrim)
- [x] No drop shadow on everything (only the loupe has an outline ring)

#### **Typography & Copy**
- [x] No Inter, Geist, or Space Grotesk fonts
- [x] No em dashes in UI copy
- [x] No emojis in UI copy
- [x] No "It's not X, it's Y" phrasing
- [x] Run all UI text through the `/humanizer` skill, including copy written in earlier phases

#### **Layout & Components**
- [x] No three feature cards in a row (fixes are a 2x2 list, steps are a vertical list)
- [x] No bento grids
- [x] No terminal-window mockups
- [x] No checkmark bullets
- [x] No soft, uniform corner radius on everything (pill buttons, square prints, lightly rounded panels)
- [x] No loose side icons floating beside text

#### **Decoration & Motion**
- [x] No radial orbs or glow blobs
- [x] No dot-grid backgrounds
- [x] No sparkle icons
- [x] No animated arrows
- [x] No hover animations on every element (hovers change color only)

#### **Content & Trust**
- [x] No fake reviews or testimonials
- [x] No default placeholder content (template text, stock filler, sample data)
- [x] No "Vite" or "React" in the browser tab title (title is "NanoRewind 4K | Restore old family photos")
- [x] Show real product demos (the landing spread is a real restoration)
- [ ] Replace the six style previews (filters on the sample, labelled as such) with real outputs: run the sample through each style and save them under `public/showcase/`
- [x] Use skeleton loaders where content loads (album, photos in the workspace, share page, app start)

#### **Pages & Navigation**
- [x] Custom 404 page (`public/404.html`)
- [x] One clear heading (`<h1>`) per page
- [x] Internal links between pages (landing footer, auth breadcrumb, share and 404 pages link home). Add the policy pages to the footer in phase 8.
- [x] Breadcrumbs on nested pages (sign in, share pages, 404). Policy pages should get them too.
- [x] Proper favicon set
- [x] Social share images for every public page (`og-card.jpg` for the landing and sign-in screens, a generated card per share link)

---

### 8. ⚖️ Compliance, SEO & Accessibility
**Goal:** Make the app legally sound, honest, discoverable and accessible before a public launch.

#### **Legal & Policies**
- [ ] Add a Privacy Policy page
- [ ] Add a Terms of Service page
- [ ] Add a Cookie Policy page
- [ ] Add a cookie consent banner
- [ ] Add business details (name, contact, address)
- [ ] License all fonts and images used

#### **Data & Consent**
- [ ] Check form consents (signup, any checkboxes)
- [ ] Don't collect unnecessary data
- [ ] Audit third-party SDKs
- [ ] Get age consent if collecting kids' data
- [ ] Add an unsubscribe link to emails
- [ ] Add a data deletion request option

#### **Honest Marketing**
- [ ] Remove dark patterns
- [ ] Remove unsupported claims

#### **Accessibility**
- [ ] Add alt text to images
- [ ] Fix color contrast ratios
- [ ] Add keyboard navigation

#### **SEO & Metadata**
- [ ] Proper page slugs (real routes like `/archive`, `/privacy`, `/terms` instead of in-app view state)
- [ ] Unique page title per page
- [ ] Unique meta description per page
- [ ] Canonical tag per page (landing page already has one)
- [ ] Add `sitemap.xml`
- [ ] Add `robots.txt`
- [ ] Add `llms.txt`
- [ ] Add structured data (JSON-LD: `WebApplication` / `Organization`)

#### **Production Build**
- [ ] Fix all console errors and warnings
- [x] No production source maps (Vite's default; confirmed no `.map` files in `dist/`)
- [ ] Reduce the JavaScript bundle (currently one 311 KB chunk; code-split routes and heavy components)

---

### 9. 💳 Paid Features (Stripe & Custom Domain)
**Goal:** Add the parts that cost money once the free version is launched and stable.

#### **Stripe Checkout (Credits Refill)**
- **Concept:** Integrates a basic payment gateway to purchase "exposures/credits" beyond the free 3 daily credits (e.g., $5 for 20 restorations).
- **Why:** Transforms the hobby app into a micro-SaaS and covers Gemini API costs.
- [ ] Stripe Checkout backend and webhook to add credits
- [ ] Credits purchase UI
- [ ] Real 4K output for paid restorations (set `imageConfig.imageSize` to `4K` in `api/restore.ts`); free restorations stay at the current size
- [ ] No three pricing tiers
- [ ] No hidden fees (show the full price before checkout)
- [ ] Add a Refund Policy page

#### **Custom Domain**
- [ ] Buy a custom domain and connect it in Vercel
- [ ] Update canonical, `og:url`, `og:image` and sitemap URLs from `nanorewind-4k.vercel.app` to the new domain

---

### 10. 🎚️ Fine-Tuning Treatment Drawer (Post-Restoration Adjustments)
*Moved here from the suggested enhancements, to come after the paid features.*
- **Concept:** A drawer with CSS filters and AI prompt modifiers.
- **Why:** Sometimes the AI gets color or brightness slightly wrong. Allowing users to tweak brightness, contrast, exposure, or apply a "Vintage Sepia" or "Black & White" filter directly in the browser after restoration adds high utility.
