import { useEffect, useState } from 'react';
import type { MouseEvent } from 'react';
import { SITE_URL } from './site';

// Every page has a real address. Vercel serves each one from its own HTML file
// (written at build time with that page's title and description, see
// vite.config.ts), and the app switches between them without reloading.
//
// The policy pages are plain static HTML with no app code. Links to them are
// ordinary links, so they always load the static page.

export type Route = 'home' | 'signin' | 'signup' | 'album' | 'privacy' | 'terms' | 'cookies';

export const PATHS: Record<Route, string> = {
  home: '/',
  signin: '/signin',
  signup: '/signup',
  album: '/album',
  privacy: '/privacy',
  terms: '/terms',
  cookies: '/cookies',
};

export const LEGAL_ROUTES = ['privacy', 'terms', 'cookies'] as const;
export type LegalRoute = (typeof LEGAL_ROUTES)[number];
export const isLegalRoute = (r: Route): r is LegalRoute => (LEGAL_ROUTES as readonly string[]).includes(r);

// What each screen says in the tab title, search results and link previews.
// 'workspace' is home for a signed-in user; 'reset' is the forgot-password
// step of the sign-in page. Neither has an address of its own.
export type PageKey = Route | 'workspace' | 'reset';

export interface PageMeta {
  title: string;
  description: string;
  path: string;        // canonical path
  index: boolean;      // false: ask search engines not to list it
}

const BRAND = 'NanoRewind 4K';

export const PAGE_META: Record<PageKey, PageMeta> = {
  home: {
    title: `${BRAND} | Restore old family photos`,
    description: 'Repair damage and faded color in old family photos. Upload a scan or a phone photo of the print. Free to try, with 3 restorations to start.',
    path: PATHS.home,
    index: true,
  },
  workspace: {
    title: `Restore a photo | ${BRAND}`,
    description: 'Upload an old photo and choose a style to restore it.',
    path: PATHS.home,
    index: true,
  },
  signin: {
    title: `Sign in | ${BRAND}`,
    description: 'Sign in to NanoRewind 4K to restore old photos and open your album.',
    path: PATHS.signin,
    index: false,
  },
  signup: {
    title: `Create an account | ${BRAND}`,
    description: 'Create a free NanoRewind 4K account. You start with 3 restorations and get 1 more every 24 hours.',
    path: PATHS.signup,
    index: false,
  },
  reset: {
    title: `Reset your password | ${BRAND}`,
    description: 'Get an email with a link to choose a new NanoRewind 4K password.',
    path: PATHS.signin,
    index: false,
  },
  album: {
    title: `Album | ${BRAND}`,
    description: 'Your restored photos.',
    path: PATHS.album,
    index: false,
  },
  privacy: {
    title: `Privacy policy | ${BRAND}`,
    description: 'What NanoRewind 4K collects, why, who else handles it, how long it is kept, and how to delete it.',
    path: PATHS.privacy,
    index: true,
  },
  terms: {
    title: `Terms of service | ${BRAND}`,
    description: 'The rules for using NanoRewind 4K, including who can use it, what you may upload and what the service does and does not promise.',
    path: PATHS.terms,
    index: true,
  },
  cookies: {
    title: `Cookie policy | ${BRAND}`,
    description: 'The cookies and browser storage NanoRewind 4K uses. Only what is needed to keep you signed in, with no analytics or ads.',
    path: PATHS.cookies,
    index: true,
  },
};

export const canonicalUrl = (path: string) => `${SITE_URL}${path === '/' ? '/' : path}`;

export const routeFromPath = (pathname: string): Route => {
  const p = pathname.replace(/\/+$/, '').replace(/\.html$/, '') || '/';
  return (Object.keys(PATHS) as Route[]).find(r => PATHS[r] === p) ?? 'home';
};

// Older versions kept screens in the hash (#signin, #signup, #album). Move
// those to the real address so old bookmarks keep working.
export const migrateLegacyHash = () => {
  const legacy: Record<string, Route> = { '#signin': 'signin', '#signup': 'signup', '#album': 'album' };
  const route = legacy[window.location.hash];
  if (route) window.history.replaceState(null, '', PATHS[route] + window.location.search);
};

const NAVIGATE_EVENT = 'nanorewind:navigate';

export const navigate = (route: Route, { replace = false } = {}) => {
  const path = PATHS[route];
  if (window.location.pathname !== path || window.location.hash) {
    if (replace) window.history.replaceState(null, '', path);
    else window.history.pushState(null, '', path);
  }
  window.dispatchEvent(new Event(NAVIGATE_EVENT));
  if (!replace) window.scrollTo(0, 0);
};

// Click handler for in-app links: keeps the real href (so the link can be
// opened in a new tab or copied) but switches screens without a reload.
export const linkTo = (route: Route, before?: () => void) => (e: MouseEvent) => {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  e.preventDefault();
  before?.();
  navigate(route);
};

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => routeFromPath(window.location.pathname));
  useEffect(() => {
    const sync = () => setRoute(routeFromPath(window.location.pathname));
    window.addEventListener('popstate', sync);
    window.addEventListener(NAVIGATE_EVENT, sync);
    return () => {
      window.removeEventListener('popstate', sync);
      window.removeEventListener(NAVIGATE_EVENT, sync);
    };
  }, []);
  return route;
}

// Keeps the tab title, description, canonical link and robots tag in step
// with the screen. Crawlers and link previews read the static HTML for each
// address; this covers screens reached inside the app.
export const setPageMeta = (key: PageKey) => {
  const meta = PAGE_META[key];
  document.title = meta.title;
  const set = (selector: string, attr: string, value: string) => {
    document.head.querySelector(selector)?.setAttribute(attr, value);
  };
  set('meta[name="description"]', 'content', meta.description);
  set('link[rel="canonical"]', 'href', canonicalUrl(meta.path));
  set('meta[property="og:url"]', 'content', canonicalUrl(meta.path));
  set('meta[property="og:title"]', 'content', meta.title);
  set('meta[property="og:description"]', 'content', meta.description);
  set('meta[name="twitter:title"]', 'content', meta.title);
  set('meta[name="twitter:description"]', 'content', meta.description);
  set('meta[name="robots"]', 'content', meta.index ? 'index, follow' : 'noindex, follow');
};

export const usePageMeta = (key: PageKey) => {
  useEffect(() => setPageMeta(key), [key]);
};
