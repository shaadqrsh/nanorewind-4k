import type { VercelRequest, VercelResponse } from './_lib/vercel.js';
import { getAnonSchemaClient } from './_lib/supabase.js';
import { PLATES_BUCKET } from './_lib/archive.js';
import { withRateLimit } from './_lib/rateLimit.js';
import { requestOrigin } from './_lib/validate.js';

// Public share pages. No sign-in: anyone with the link may view.
//
//   GET /share/<id>                        (rewritten here by vercel.json)
//       → HTML page with a before/after slider and link-preview tags
//   GET /api/share?id=<id>&image=restored|original
//       → 302 to a short-lived signed URL for that image
//
// Only restorations with a share_id are reachable (see get_shared_restoration
// and the "read shared plates" storage rule). The page never shows who shared
// it or the original filename. Pages are marked noindex: links are unlisted.

const SHARE_ID_RE = /^[A-Za-z0-9_-]{16,64}$/;
// Short, so turning sharing off takes effect quickly for anyone holding a URL.
const IMAGE_URL_TTL_S = 10 * 60;

const STYLE_LABELS: Record<string, string> = {
  standard: 'Natural color',
  'silver-gelatin': 'Black & white',
  albumen: 'Sepia',
  cyanotype: 'Cyanotype blue',
  autochrome: 'Soft pastel',
  kodachrome: 'Vivid film',
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

async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const id = typeof req.query.id === 'string' ? req.query.id : '';
  const image = req.query.image;

  try {
    const shared = SHARE_ID_RE.test(id) ? await loadShared(id) : null;

    if (image !== undefined) {
      if (!shared || (image !== 'restored' && image !== 'original')) return res.status(404).end();
      const path = image === 'original' ? shared.original_path : shared.restored_path;
      const { data, error } = await getAnonSchemaClient().storage
        .from(PLATES_BUCKET)
        .createSignedUrl(path, IMAGE_URL_TTL_S);
      if (error || !data?.signedUrl) throw error ?? new Error('Could not sign image URL');
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('Location', data.signedUrl);
      return res.status(302).end();
    }

    if (!shared) return sendPage(res, 404, notFoundPage());
    return sendPage(res, 200, sharePage(requestOrigin(req), id, shared));
  } catch (err) {
    console.error('Share page error:', err);
    if (image !== undefined) return res.status(500).end();
    return sendPage(res, 500, notFoundPage('Something went wrong loading this photo. Please try again.'));
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
    "default-src 'none'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; " +
      "font-src https://fonts.gstatic.com; img-src 'self' data: https://*.supabase.co; " +
      "base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  );
  res.status(status).send(html);
}

const shell = (head: string, body: string) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<meta name="theme-color" content="#0c0a09">
${head}
<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23E0A458' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 12' /%3E%3Cpath d='M3 3v9h9' /%3E%3C/svg%3E">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..700;1,9..144,300..700&family=Geist+Mono:wght@400..500&family=Geist:wght@400..500&display=swap">
<link rel="stylesheet" href="/share-viewer.css">
</head>
<body>
<header class="bar"><a class="brand" href="/">NanoRewind</a></header>
<main class="wrap">
${body}
</main>
</body>
</html>`;

function sharePage(origin: string, id: string, r: SharedRestoration): string {
  const pageUrl = `${origin}/share/${id}`;
  const img = (kind: string) => `/api/share?id=${id}&amp;image=${kind}`;
  const style = STYLE_LABELS[r.process] ?? STYLE_LABELS.standard;
  const date = new Date(r.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const description = 'Drag to compare the original photo with its restoration.';

  const head = `<title>A restored photograph | NanoRewind</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(pageUrl)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="NanoRewind">
<meta property="og:url" content="${esc(pageUrl)}">
<meta property="og:title" content="A restored photograph">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${esc(`${origin}/api/share?id=${id}&image=restored`)}">
<meta property="og:image:alt" content="A restored photograph">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="A restored photograph">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${esc(`${origin}/api/share?id=${id}&image=restored`)}">
<script src="/share-viewer.js" defer></script>`;

  const body = `<h1>A restored photograph</h1>
<p class="meta">Restored on ${esc(date)} in the ${esc(style)} style.</p>
<figure class="compare" data-compare>
  <img class="after" src="${img('restored')}" alt="The restored photograph" draggable="false">
  <div class="before" data-before><img src="${img('original')}" alt="The original photograph" draggable="false"></div>
  <div class="handle" data-handle aria-hidden="true"></div>
  <span class="label label-before">Original</span>
  <span class="label label-after">Restored</span>
</figure>
<p class="hint">Drag across the photo, or use the arrow keys, to compare.</p>
<a class="cta" href="/">Restore your own photos</a>`;

  return shell(head, body);
}

function notFoundPage(message = 'The person who shared it may have turned the link off.'): string {
  const head = `<title>Link not available | NanoRewind</title>`;
  const body = `<h1>This link isn't available</h1>
<p class="meta">${esc(message)}</p>
<a class="cta" href="/">Go to NanoRewind</a>`;
  return shell(head, body);
}

export default withRateLimit(handler, { name: 'share', limit: 300, windowMs: 10 * 60 * 1000 });
