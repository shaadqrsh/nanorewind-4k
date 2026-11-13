import React from 'react';
import { buttonClass } from './Button';
import { Wordmark } from './Wordmark';
import { PhotoSpread, SAMPLE_AFTER } from './PhotoSpread';
import { PROCESSES } from './PromptSelector';
import { SiteFooter, SkipLink } from './SiteChrome';
import { linkTo, PATHS } from '../utils/routes';

const FIXES = [
  { title: 'Scratches and tears', desc: 'Fills in cracks, dust and fold lines by redrawing the damaged areas.' },
  { title: 'Faded color', desc: 'Fixes yellowing and color casts so skin and clothes look natural again.' },
  { title: 'Soft focus', desc: 'Sharpens blurry detail, including faces.' },
  { title: 'Small scans', desc: 'Makes a sharper copy of a small or low-resolution scan, at about one megapixel (for example 1024 by 1024 pixels).' },
];

const STYLE_NOTES: Record<string, string> = {
  'standard': 'True to life',
  'silver-gelatin': 'High contrast',
  'albumen': 'Warm brown tone',
  'cyanotype': 'Prussian-blue wash',
  'autochrome': 'Muted early color',
  'kodachrome': 'Punchy reds',
};

const STEPS = [
  { title: 'Upload a photo', desc: 'A scan or a phone snap of the print. JPG, PNG or WebP, up to 10 at once.' },
  { title: 'Choose a style', desc: 'Keep natural color, or pick one of the other five.' },
  { title: 'Keep it', desc: 'Compare it with the original and download it. Every result is also saved to your album.' },
];

const linkCls = 'hover:text-bone transition-colors';

export const LandingPage: React.FC = () => {
  const signIn = { href: PATHS.signin, onClick: linkTo('signin') };
  const signUp = { href: PATHS.signup, onClick: linkTo('signup') };

  return (
    <div className="min-h-dvh flex flex-col">
      <SkipLink />
      <header className="bg-cover border-b border-rule">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-9 py-[18px] flex items-center justify-between gap-4">
          <a href="/" aria-label="NanoRewind 4K home"><Wordmark className="text-[19px] min-[400px]:text-[21px] sm:text-2xl" /></a>
          <nav aria-label="Account" className="flex items-center gap-3.5 sm:gap-5">
            <a {...signIn} className="font-bold whitespace-nowrap hover:text-bone-2 transition-colors">Sign in</a>
            {/* Too wide for small phones, where the hero's buttons sit right below. */}
            <a {...signUp} className={`${buttonClass('primary', 'sm')} hidden min-[440px]:inline-flex`}>Get started</a>
          </nav>
        </div>
      </header>

      <main id="main" tabIndex={-1} className="flex-1 outline-none">
        <section className="mx-auto max-w-[1200px] px-4 sm:px-9 pt-11 pb-20 lg:pt-[72px] lg:pb-[120px] grid gap-11 lg:grid-cols-[5fr_7fr] lg:gap-16 lg:items-center">
          <div className="flex flex-col gap-[22px] min-w-0">
            <h1 className="font-display text-[clamp(42px,5.8vw,74px)] leading-[1.02] tracking-[-0.012em]">Restore your family photos</h1>
            <p className="text-[19px] text-bone-2 max-w-[36ch]">
              Upload a scan or a phone photo of an old print. NanoRewind repairs the damage and corrects faded color,
              then keeps the result in your own private album.
            </p>
            <div className="flex flex-wrap gap-3 mt-2">
              <a {...signUp} className={buttonClass('primary')}>Restore a photo</a>
              <a {...signIn} className={buttonClass('quiet')}>Sign in</a>
            </div>
            <p className="text-[15px] text-bone-3">3 free restorations to start, and 1 more every 24 hours. No card needed.</p>
          </div>
          <PhotoSpread />
        </section>

        <section className="border-t border-rule">
          <div className="mx-auto max-w-[1200px] px-4 sm:px-9 py-[72px] lg:py-[104px]">
            <h2 className="font-display text-[clamp(30px,3.6vw,46px)] leading-[1.06] mb-10">What it fixes</h2>
            <ul className="grid gap-x-12 gap-y-7 md:grid-cols-2">
              {FIXES.map(f => (
                <li key={f.title} className="flex flex-col gap-1.5 pt-[18px] border-t border-rule">
                  <h3 className="font-display text-2xl leading-tight">{f.title}</h3>
                  <p className="text-bone-2 max-w-[42ch]">{f.desc}</p>
                </li>
              ))}
            </ul>
            <p className="mt-10 text-[15px] text-bone-3 max-w-[64ch]">
              The restoration is made by AI (Google Gemini). It redraws what's damaged or blurry, so faces, writing and
              other small details can come out a little different from the original. Compare each result with the
              original before you keep it.
            </p>
          </div>
        </section>

        <section className="border-t border-rule">
          <div className="mx-auto max-w-[1200px] px-4 sm:px-9 py-[72px] lg:py-[104px]">
            <div className="flex flex-col gap-3 mb-10 max-w-[620px]">
              <h2 className="font-display text-[clamp(30px,3.6vw,46px)] leading-[1.06]">Six styles</h2>
              <p className="text-bone-2">Natural color is the default. The other five give the photo an older look.</p>
            </div>
            <ul className="grid grid-cols-3 lg:grid-cols-6 gap-x-[22px] gap-y-9 lg:gap-7">
              {PROCESSES.map(p => (
                <li key={p.key} className="min-w-0">
                  <div className="mount mount-sm">
                    <img src={SAMPLE_AFTER} alt="" loading="lazy"
                      className={`block w-full aspect-[4/5] object-cover object-[50%_40%] look-${p.key}`} />
                  </div>
                  <p className="mt-3 text-[15px] text-bone-2"><b className="block text-bone">{p.label}</b>{STYLE_NOTES[p.key]}</p>
                </li>
              ))}
            </ul>
            <p className="mt-10 text-[15px] text-bone-3 max-w-[60ch]">
              These previews put a filter on the sample above, so a real restoration in each style will look a little different.
            </p>
          </div>
        </section>

        <section className="border-t border-rule">
          <div className="mx-auto max-w-[1200px] px-4 sm:px-9 py-[72px] lg:py-[104px]">
            <h2 className="font-display text-[clamp(30px,3.6vw,46px)] leading-[1.06] mb-10">How it works</h2>
            <ol className="max-w-[760px]">
              {STEPS.map((s, i) => (
                <li key={s.title} className="grid grid-cols-[48px_1fr] gap-x-4 gap-y-1 py-5 border-t border-rule">
                  <span className="font-display text-[28px] leading-none text-bone-3" aria-hidden="true">{i + 1}</span>
                  <h3 className="font-bold text-[19px] leading-snug">{s.title}</h3>
                  <p className="col-start-2 text-bone-2">{s.desc}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <div className="mx-auto max-w-[1200px] px-4 sm:px-9">
          <section className="py-16 border-t border-rule flex flex-wrap items-center justify-between gap-6">
            <div>
              <h2 className="font-display text-[clamp(28px,3.4vw,42px)] leading-[1.08]">Try it on a photo of your own</h2>
              <p className="mt-2.5 text-bone-2">Sign up for free. You start with 3 restorations and get 1 more every 24 hours.</p>
            </div>
            <a {...signUp} className={buttonClass('primary')}>Restore a photo</a>
          </section>
        </div>
      </main>

      <SiteFooter>
        <a {...signIn} className={linkCls}>Sign in</a>
        <a {...signUp} className={linkCls}>Create an account</a>
      </SiteFooter>
    </div>
  );
};
