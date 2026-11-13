import React, { useEffect, useState } from 'react';
import { PATHS } from '../utils/routes';
import { REPO_URL } from '../utils/site';

// Page furniture shared by every screen: the skip link, the footer and the
// cookie notice. The policy pages are prerendered from these too, so they must
// render the same on the server (no window access while rendering).

// First thing a keyboard user reaches: jumps past the header to the page's
// <main id="main">. Without JavaScript (the static policy pages) it's a plain
// in-page link.
export const SkipLink: React.FC = () => (
  <a
    href="#main"
    className="skip-link"
    onClick={(e) => {
      const main = document.getElementById('main');
      if (!main) return;
      e.preventDefault();
      main.focus();
    }}
  >
    Skip to content
  </a>
);

const footLink = 'hover:text-bone transition-colors';

// Policy links go to the static pages with ordinary navigation.
export const PolicyLinks: React.FC<{ className?: string }> = ({ className = footLink }) => (
  <>
    <a href={PATHS.privacy} className={className}>Privacy</a>
    <a href={PATHS.terms} className={className}>Terms</a>
    <a href={PATHS.cookies} className={className}>Cookies</a>
  </>
);

export const SiteFooter: React.FC<{ children?: React.ReactNode; wide?: boolean }> = ({ children, wide = false }) => (
  <footer className="bg-cover border-t border-rule">
    <div className={`mx-auto ${wide ? 'max-w-[1440px]' : 'max-w-[1200px]'} px-4 sm:px-9 py-7 flex flex-wrap items-center justify-between gap-x-8 gap-y-4 text-[15px] text-bone-3`}>
      <span>NanoRewind 4K</span>
      <nav aria-label="Site" className="flex flex-wrap gap-x-6 gap-y-2">
        {children}
        <PolicyLinks />
        <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className={footLink}>Source code</a>
      </nav>
      <span>Powered by Google Gemini</span>
    </div>
  </footer>
);

const NOTICE_KEY = 'nanorewind:cookie-notice';

const noticeDismissed = () => {
  try {
    return localStorage.getItem(NOTICE_KEY) === 'dismissed';
  } catch {
    return false;
  }
};

// Information only. The site sets no optional cookies, so there is nothing to
// accept or refuse (see /cookies). Dismissing it is remembered in this browser.
export const CookieNotice: React.FC = () => {
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(!noticeDismissed()), []);
  if (!open) return null;

  const dismiss = () => {
    setOpen(false);
    try { localStorage.setItem(NOTICE_KEY, 'dismissed'); } catch { /* private mode: shows again next time */ }
  };

  return (
    <section
      aria-label="Cookie notice"
      className="fixed z-[90] bottom-4 left-4 right-4 sm:right-auto sm:max-w-[420px] bg-panel border border-rule rounded-md p-4 sm:p-5 animate-fade-in"
    >
      <p className="text-[15px] text-bone-2">
        NanoRewind only uses the cookies it needs to keep you signed in. There are no analytics or ad cookies, so
        there's nothing to accept.
      </p>
      <div className="mt-3.5 flex items-center gap-5 text-[15px]">
        <button type="button" onClick={dismiss}
          className="min-h-10 px-[18px] rounded-full border-[1.5px] border-bone bg-bone text-page font-bold hover:bg-corner hover:border-corner transition-colors">
          OK
        </button>
        <a href={PATHS.cookies} className="text-bone-2 underline decoration-rule decoration-[1.5px] underline-offset-4 hover:text-bone hover:decoration-bone-3">
          Cookie policy
        </a>
      </div>
    </section>
  );
};
