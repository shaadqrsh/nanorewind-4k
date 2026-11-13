import type { VercelRequest, VercelResponse } from './_lib/vercel.js';
import { getAnonSchemaClient } from './_lib/supabase.js';
import { PLATES_BUCKET } from './_lib/archive.js';
import { withRateLimit } from './_lib/rateLimit.js';
import { requestOrigin } from './_lib/validate.js';
import { imageKind } from './_lib/imageKind.js';

// The card renderer (satori + wasm) loads only when a card is requested, so
// share pages and image links don't pay for it, and keep working if it fails.
const loadCardRenderer = () => import('./_lib/shareCard.js');

// Public share pages. No sign-in: anyone with the link may view.
//
//   GET /share/<id>                        (rewritten here by vercel.json)
//       → HTML page with a before/after slider and link-preview tags
//   GET /api/share?id=<id>&image=restored|original
//       → 302 to a short-lived signed URL for that image
//   GET /api/share?id=<id>&image=card
//       → the 1200x630 link-preview card (PNG), or the restored photo if the
//         card can't be drawn
//
// Only restorations with a share_id are reachable (see get_shared_restoration
// and the "read shared plates" storage rule). The page never shows who shared
// it or the original filename. Pages are marked noindex: links are unlisted.

const SHARE_ID_RE = /^[A-Za-z0-9_-]{16,64}$/;
// Short, so turning sharing off takes effect quickly for anyone holding a URL.
const IMAGE_URL_TTL_S = 10 * 60;
const CARD_IMAGE_MAX_BYTES = 8 * 1024 * 1024;

const STYLE_LABELS: Record<string, string> = {
  standard: 'natural color',
  'silver-gelatin': 'black and white',
  albumen: 'sepia',
  cyanotype: 'cyanotype blue',
  autochrome: 'soft pastel',
  kodachrome: 'vivid film',
};

interface SharedRestoration {
  original_path: string;
  restored_path: string;
  process: string;
  created_at: string;
}

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

const loadShared = async (id: string): Promise<SharedRestoration | null> => {
  const { data, error } = await getAnonSchemaClient().rpc('get_shared_restoration', { p_share_id: id });
  if (error) throw error;
  return (data as SharedRestoration | null) ?? null;
};

const signedUrl = async (path: string, ttl = IMAGE_URL_TTL_S): Promise<string> => {
  const { data, error } = await getAnonSchemaClient().storage.from(PLATES_BUCKET).createSignedUrl(path, ttl);
  if (error || !data?.signedUrl) throw error ?? new Error('Could not sign image URL');
  return data.signedUrl;
};

// A stored image as a data URI for the card, or null if it can't be drawn
// (WebP, too large, missing).
const imageForCard = async (path: string): Promise<string | null> => {
  const res = await fetch(await signedUrl(path, 60), { signal: AbortSignal.timeout(8000) });
  if (!res.ok) return null;
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (bytes.byteLength > CARD_IMAGE_MAX_BYTES) return null;
  const kind = imageKind(bytes);
  return kind ? `data:${kind};base64,${Buffer.from(bytes).toString('base64')}` : null;
};

async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const id = typeof req.query.id === 'string' ? req.query.id : '';
  const image = req.query.image;

  try {
    const shared = SHARE_ID_RE.test(id) ? await loadShared(id) : null;

    if (image === 'card') {
      if (!shared) return res.status(404).end();
      try {
        const [after, before] = await Promise.all([
          imageForCard(shared.restored_path),
          imageForCard(shared.original_path).catch(() => null),
        ]);
        if (!after) throw new Error('The restored image is not PNG or JPEG');
        const { renderShareCard } = await loadCardRenderer();
        const png = await renderShareCard(after, before);
        res.setHeader('Content-Type', 'image/png');
        // Browsers may reuse it briefly; the CDN doesn't keep it, so a link that
        // was turned off stops serving its card.
        res.setHeader('Cache-Control', 'private, max-age=600');
        return res.status(200).send(png);
      } catch (err) {
        console.error('Share card error, sending the photo instead:', err);
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('Location', await signedUrl(shared.restored_path));
        return res.status(302).end();
      }
    }

    if (image !== undefined) {
      if (!shared || (image !== 'restored' && image !== 'original')) return res.status(404).end();
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('Location', await signedUrl(image === 'original' ? shared.original_path : shared.restored_path));
      return res.status(302).end();
    }

    if (!shared) return sendPage(res, 404, notFoundPage());
    return sendPage(res, 200, sharePage(requestOrigin(req), id, shared));
  } catch (err) {
    console.error('Share page error:', err);
    if (image !== undefined) return res.status(500).end();
    return sendPage(res, 500, notFoundPage('Something went wrong while loading this photo. Try again in a moment.'));
  }
}

function sendPage(res: VercelResponse, status: number, html: string) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  // The link itself is the secret, so it must not leak to other sites.
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'none'; script-src 'self'; style-src 'self'; " +
      "font-src 'self'; img-src 'self' data: https://*.supabase.co; manifest-src 'self'; " +
      "base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  );
  res.status(status).send(html);
}

const shell = (head: string, crumb: string, body: string) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<meta name="theme-color" content="#1f0e10">
${head}
<link rel="icon" href="/favicon.ico?v=2" sizes="32x32">
<link rel="icon" href="/favicon.svg?v=2" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png?v=2">
<link rel="preload" href="/fonts/atkinson-hyperlegible-latin-400-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fonts/young-serif-latin-400-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/fonts/fonts.css">
<link rel="stylesheet" href="/share-viewer.css">
</head>
<body>
<a class="skip-link" href="#main">Skip to content</a>
<header class="bar">
  <div class="bar-in">
    <a class="brand" href="/"><img src="/favicon.svg?v=2" alt="" width="32" height="32">NanoRewind <span>4K</span></a>
    <a class="btn btn-quiet" href="/signup">Restore your own</a>
  </div>
</header>
<main class="wrap" id="main" tabindex="-1">
<nav class="crumbs" aria-label="Breadcrumb"><ol><li><a href="/">NanoRewind 4K</a></li><li aria-current="page">${esc(crumb)}</li></ol></nav>
${body}
</main>
<footer class="foot"><div class="foot-in"><span>NanoRewind 4K</span><nav aria-label="Site"><a href="/">Restore old family photos</a><a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="/cookies">Cookies</a></nav></div></footer>
</body>
</html>`;

function sharePage(origin: string, id: string, r: SharedRestoration): string {
  const pageUrl = `${origin}/share/${id}`;
  const card = `${origin}/api/share?id=${id}&image=card`;
  const img = (kind: string) => `/api/share?id=${id}&amp;image=${kind}`;
  const style = STYLE_LABELS[r.process] ?? STYLE_LABELS.standard;
  const date = new Date(r.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const description = 'Compare an old photo with its restored copy.';

  const head = `<title>A restored photograph | NanoRewind 4K</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(pageUrl)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="NanoRewind 4K">
<meta property="og:url" content="${esc(pageUrl)}">
<meta property="og:title" content="A restored photograph">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${esc(card)}">
<meta property="og:image:type" content="image/png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="An old photo and its restored copy, side by side">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="A restored photograph">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${esc(card)}">
<script src="/share-viewer.js" defer></script>`;

  const body = `<h1>A restored photograph</h1>
<p class="meta">Restored on ${esc(date)} in ${esc(style)}.</p>
<div class="mount stage">
  <figure class="compare" data-compare>
    <img class="after" src="${img('restored')}" alt="The restored photograph" draggable="false">
    <div class="before" data-before><img src="${img('original')}" alt="The original photograph" draggable="false"></div>
    <div class="handle" data-handle aria-hidden="true"><span></span></div>
    <span class="tag tag-before">Before</span>
    <span class="tag tag-after">After</span>
  </figure>
</div>
<p class="hint">Drag across the photo, or use the arrow keys, to compare.</p>
<section class="cta">
  <div>
    <h2>Have an old photo of your own?</h2>
    <p>NanoRewind 4K repairs damage and faded color in old photos. Free to try, no card needed.</p>
  </div>
  <a class="btn" href="/signup">Restore a photo</a>
</section>`;

  return shell(head, 'Shared photo', body);
}

function notFoundPage(message = 'The person who shared it may have turned the link off.'): string {
  const head = `<title>Link not available | NanoRewind 4K</title>`;
  const body = `<div class="missing">
  <div class="mount slot" aria-hidden="true"></div>
  <div>
    <h1>This link isn't available</h1>
    <p class="meta">${esc(message)}</p>
    <a class="btn" href="/">Go to NanoRewind 4K</a>
  </div>
</div>`;
  return shell(head, 'Link not available', body);
}

export default withRateLimit(handler, { name: 'share', limit: 300, windowMs: 10 * 60 * 1000 });
