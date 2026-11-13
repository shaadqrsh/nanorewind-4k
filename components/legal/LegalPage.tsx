import React from 'react';
import { buttonClass } from '../Button';
import { Wordmark } from '../Wordmark';
import { SiteFooter, SkipLink } from '../SiteChrome';
import { LegalRoute, PATHS } from '../../utils/routes';
import { POLICIES_UPDATED, POLICIES_UPDATED_ISO } from '../../utils/site';
import { PrivacyPolicy } from './PrivacyPolicy';
import { TermsOfService } from './TermsOfService';
import { CookiePolicy } from './CookiePolicy';

// The policy pages. In production they're static HTML rendered from this
// component at build time (see vite.config.ts), with no app code, so every
// link here is an ordinary link.

const PAGES: Record<LegalRoute, { title: string; Body: React.FC }> = {
  privacy: { title: 'Privacy policy', Body: PrivacyPolicy },
  terms: { title: 'Terms of service', Body: TermsOfService },
  cookies: { title: 'Cookie policy', Body: CookiePolicy },
};

const ORDER: LegalRoute[] = ['privacy', 'terms', 'cookies'];

export const LegalPage: React.FC<{ page: LegalRoute }> = ({ page }) => {
  const { title, Body } = PAGES[page];
  return (
    <div className="min-h-dvh flex flex-col">
      <SkipLink />
      <header className="bg-cover border-b border-rule">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-9 py-[18px] flex items-center justify-between gap-4">
          <a href={PATHS.home} aria-label="NanoRewind 4K home"><Wordmark className="text-lg min-[400px]:text-[21px] sm:text-2xl" /></a>
          <a href={PATHS.home} className={buttonClass('quiet', 'sm')}>
            Restore<span className="hidden min-[440px]:inline">&nbsp;a photo</span>
          </a>
        </div>
      </header>

      <main id="main" tabIndex={-1} className="flex-1 mx-auto w-full max-w-[1200px] px-4 sm:px-9 pt-7 pb-24 outline-none">
        <nav aria-label="Breadcrumb" className="text-[15px]">
          <ol className="flex flex-wrap items-center gap-2 text-bone-3">
            <li><a href={PATHS.home} className="hover:text-bone transition-colors">NanoRewind <span className="text-brass">4K</span></a></li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="text-bone-2">{title}</li>
          </ol>
        </nav>

        <div className="mt-10 grid gap-10 lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-16">
          <nav aria-label="Policies" className="lg:pt-3">
            <ul className="flex flex-wrap gap-x-6 gap-y-2 lg:flex-col lg:gap-3 text-[15px]">
              {ORDER.map(p => (
                <li key={p}>
                  <a href={PATHS[p]} aria-current={p === page ? 'page' : undefined}
                    className={p === page ? 'font-bold text-brass' : 'text-bone-2 hover:text-bone transition-colors'}>
                    {PAGES[p].title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <article className="legal min-w-0 max-w-[70ch]">
            <h1 className="font-display text-[clamp(38px,5vw,56px)] leading-[1.02]">{title}</h1>
            <p className="mt-3 text-[15px] text-bone-3">Last updated <time dateTime={POLICIES_UPDATED_ISO}>{POLICIES_UPDATED}</time></p>
            <Body />
          </article>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
};
