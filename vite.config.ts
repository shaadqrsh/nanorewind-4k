import fs from 'node:fs';
import path from 'path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { canonicalUrl, LEGAL_ROUTES, PAGE_META, PATHS, type PageKey, type Route } from './utils/routes';
import { POLICIES_UPDATED_ISO } from './utils/site';
import { LegalPage } from './components/legal/LegalPage';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// The per-page tags between <!-- page-meta --> and <!-- /page-meta --> in index.html.
const pageHead = (key: PageKey) => {
  const m = PAGE_META[key];
  const url = canonicalUrl(m.path);
  return [
    '<!-- page-meta -->',
    `<title>${esc(m.title)}</title>`,
    `<meta name="description" content="${esc(m.description)}" />`,
    `<meta name="robots" content="${m.index ? 'index, follow' : 'noindex, follow'}" />`,
    `<link rel="canonical" href="${url}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:title" content="${esc(m.title)}" />`,
    `<meta property="og:description" content="${esc(m.description)}" />`,
    `<meta name="twitter:title" content="${esc(m.title)}" />`,
    `<meta name="twitter:description" content="${esc(m.description)}" />`,
    '<!-- /page-meta -->',
  ].join('\n    ');
};

const between = (html: string, tag: string, replacement: string) => {
  const re = new RegExp(`<!-- ${tag}[^>]*-->[\\s\\S]*?<!-- /${tag} -->`);
  if (!re.test(html)) throw new Error(`index.html is missing the <!-- ${tag} --> block`);
  return html.replace(re, replacement);
};

// After the build, writes one HTML file per address, each with its own title,
// description, canonical link and robots tag (Vercel's cleanUrls serves
// /signin from signin.html). The policy pages are rendered to static HTML
// here and ship without the app's JavaScript. Also writes sitemap.xml.
function staticPages(): Plugin {
  return {
    name: 'nanorewind-static-pages',
    apply: 'build',
    writeBundle(options) {
      const dir = options.dir ?? path.resolve(__dirname, 'dist');
      const template = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
      const write = (name: string, html: string) => fs.writeFileSync(path.join(dir, name), html);

      const appPages: Route[] = ['home', 'signin', 'signup', 'album'];
      for (const route of appPages) {
        let html = between(template, 'page-meta', pageHead(route));
        if (route !== 'home') html = between(html, 'structured-data', '');
        write(route === 'home' ? 'index.html' : `${route}.html`, html);
      }

      for (const route of LEGAL_ROUTES) {
        let html = between(template, 'page-meta', pageHead(route));
        html = between(html, 'structured-data', '');
        html = html
          .replace(/\s*<script type="module"[^>]*><\/script>/g, '')
          .replace(/\s*<link rel="modulepreload"[^>]*>/g, '');
        const body = renderToStaticMarkup(createElement(LegalPage, { page: route }));
        html = html.replace('<div id="root"></div>', `<div id="root">${body}</div>`);
        if (!html.includes(body)) throw new Error(`Could not prerender ${route}`);
        write(`${route}.html`, html);
      }

      const listed = (Object.keys(PATHS) as Route[]).filter(r => PAGE_META[r].index);
      const urls = listed.map(r => {
        const lastmod = (LEGAL_ROUTES as readonly string[]).includes(r) ? `\n    <lastmod>${POLICIES_UPDATED_ISO}</lastmod>` : '';
        return `  <url>\n    <loc>${canonicalUrl(PATHS[r])}</loc>${lastmod}\n  </url>`;
      });
      write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`);
    },
  };
}

export default defineConfig(() => {
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react(), staticPages()],
      build: {
        rollupOptions: {
          output: {
            // React changes less often than the app, so it gets its own
            // long-cached file.
            manualChunks: { react: ['react', 'react-dom', 'react-dom/client'] },
          },
        },
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
