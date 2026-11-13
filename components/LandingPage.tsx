import React from 'react';
import { History, ArrowRight, Eraser, Palette, Focus, Ticket, Upload, SlidersHorizontal, Download } from 'lucide-react';
import { Button } from './Button';
import { BeforeAfterShowcase } from './BeforeAfterShowcase';
import { PROCESSES } from './PromptSelector';

interface LandingPageProps {
  onSignIn: () => void;
  onSignUp: () => void;
}

const FEATURES = [
  { Icon: Eraser, title: 'Scratch repair', desc: 'Erases cracks, tears, dust and fold lines while keeping the detail underneath.' },
  { Icon: Palette, title: 'Color correction', desc: 'Fixes yellowing, fading and color casts for natural, balanced tones.' },
  { Icon: Focus, title: '4K resolution', desc: 'Sharpens soft focus and recovers faces, then upscales to crisp high resolution.' },
  { Icon: Ticket, title: '3 free a day', desc: 'Three restorations every day, refilled automatically. No card required.' },
];

const STEPS = [
  { Icon: Upload, title: 'Upload a photo', desc: 'A scan or a phone snap of the print. JPG, PNG or WebP.' },
  { Icon: SlidersHorizontal, title: 'Choose a style', desc: 'Keep natural color, or develop it as one of six classic processes.' },
  { Icon: Download, title: 'Download it', desc: 'Compare it with the original and save the result. It also stays in your archive.' },
];

// Small registration-mark corners used on framed panels across the app.
const Corners: React.FC = () => (
  <>
    <span className="absolute -top-px -left-px w-2 h-2 border-t border-l border-amber-500/50 pointer-events-none" />
    <span className="absolute -bottom-px -right-px w-2 h-2 border-b border-r border-amber-500/50 pointer-events-none" />
  </>
);

export const LandingPage: React.FC<LandingPageProps> = ({ onSignIn, onSignUp }) => {
  return (
    // The body doesn't scroll on desktop (the app is a fixed-height workspace), so the page scrolls itself.
    <div className="h-dvh overflow-y-auto overflow-x-hidden">

      {/* Nav */}
      <nav className="sticky top-0 z-30 border-b border-ink-800/80 bg-ink-950/75 backdrop-blur-xl">
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />
        <div className="container mx-auto max-w-7xl px-5 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="relative grid place-items-center w-9 h-9 bg-ink-900 border border-ink-700 shadow-safelight">
              <div className="absolute inset-0 bg-amber-500/5 animate-safelight-pulse" />
              <History className="relative w-[18px] h-[18px] text-amber-500" strokeWidth={2} />
            </div>
            <span className="font-display text-lg font-semibold text-ink-100 tracking-tight">NanoRewind</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <button onClick={onSignIn}
              className="px-2 py-2 font-mono text-[11px] uppercase tracking-widest text-ink-400 hover:text-amber-400 transition-colors">
              Sign in
            </button>
            <Button onClick={onSignUp} className="!py-2 !px-3.5 sm:!px-4 !text-[11px]">
              <span className="hidden sm:inline">Get started</span>
              <span className="sm:hidden">Start</span>
            </Button>
          </div>
        </div>
      </nav>

      <main>
        {/* Hero */}
        <section className="relative">
          <div className="absolute -top-24 left-1/4 w-[38rem] h-[38rem] max-w-full bg-amber-500/[0.07] blur-[140px] animate-safelight-pulse pointer-events-none" />
          <div className="relative container mx-auto max-w-7xl px-5 pt-12 pb-16 sm:pt-16 lg:pt-24 lg:pb-28 grid lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            <div className="lg:col-span-6 animate-rise">
              <h1 className="font-display font-light text-[44px] sm:text-6xl xl:text-7xl leading-[1.02] tracking-tight text-ink-100 text-balance">
                Restore history<br />
                <span className="italic font-normal text-amber-400">to 4K.</span>
              </h1>
              <p className="mt-6 max-w-lg text-lg text-ink-400 leading-relaxed">
                Old, scratched, or faded memories developed in seconds.
              </p>

              <div className="mt-9 flex flex-col sm:flex-row gap-3">
                <Button onClick={onSignUp} icon={ArrowRight}>Restore a photo</Button>
                <Button onClick={onSignIn} variant="outline">I have an account</Button>
              </div>

              <p className="mt-6 text-sm text-ink-500">
                3 free restorations a day. No card needed.
              </p>
            </div>

            <div className="lg:col-span-6 animate-rise" style={{ animationDelay: '120ms' }}>
              <BeforeAfterShowcase beforeSrc="/showcase/before.png" afterSrc="/showcase/after.png" />
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="border-t border-ink-800/80">
          <div className="container mx-auto max-w-7xl px-5 py-16 lg:py-24">
            <h2 className="font-display text-3xl sm:text-4xl font-light leading-tight text-ink-100 mb-10 lg:mb-14">
              What it fixes
            </h2>

            {/* Ledger grid: 1px gaps over a hairline background read as ruled lines */}
            <ul className="grid sm:grid-cols-2 lg:grid-cols-4 gap-px bg-ink-800 border border-ink-800 shadow-plate">
              {FEATURES.map(({ Icon, title, desc }, i) => (
                <li key={title} className="group relative bg-ink-900/95 p-6 lg:p-7 transition-colors duration-300 hover:bg-ink-850">
                  <span className="absolute top-0 left-0 h-px w-0 bg-amber-500 transition-all duration-500 group-hover:w-full" />
                  <div className="flex items-center justify-between mb-8">
                    <div className="grid place-items-center w-11 h-11 border border-ink-700 bg-ink-950 transition-all duration-300 group-hover:border-amber-500/50 group-hover:-translate-y-0.5 group-hover:shadow-safelight">
                      <Icon className="w-5 h-5 text-ink-400 transition-colors duration-300 group-hover:text-amber-400" strokeWidth={1.75} />
                    </div>
                    <span className="font-mono text-[10px] text-ink-600">0{i + 1}</span>
                  </div>
                  <h3 className="font-display text-lg font-semibold text-ink-100 mb-2">{title}</h3>
                  <p className="text-sm text-ink-400 leading-relaxed">{desc}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* How it works */}
        <section className="border-t border-ink-800/80">
          <div className="container mx-auto max-w-7xl px-5 py-16 lg:py-24">
            <h2 className="font-display text-3xl sm:text-4xl font-light leading-tight text-ink-100 mb-10 lg:mb-14">
              How it works
            </h2>

            <ol className="grid md:grid-cols-3 gap-8 md:gap-6">
              {STEPS.map(({ Icon, title, desc }, i) => (
                <li key={title} className="relative">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="font-mono text-[11px] text-amber-500/80">{i + 1}</span>
                    <span className="h-px flex-1 bg-gradient-to-r from-ink-700 to-transparent" />
                    <Icon className="w-4 h-4 text-ink-500" />
                  </div>
                  <h3 className="font-display text-lg font-semibold text-ink-100 mb-1.5">{title}</h3>
                  <p className="text-sm text-ink-400 leading-relaxed">{desc}</p>
                  {i === 1 && (
                    <ul className="mt-4 flex flex-wrap gap-1.5">
                      {PROCESSES.map(p => (
                        <li key={p.key} title={p.desc}
                          className="font-mono text-[9px] uppercase tracking-wider px-2 py-1 border border-ink-700 text-ink-400 transition-colors hover:border-amber-500/40 hover:text-amber-400">
                          {p.label}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Closing CTA */}
        <section className="border-t border-ink-800/80">
          <div className="container mx-auto max-w-7xl px-5 py-16 lg:py-24">
            <div className="relative overflow-hidden bg-ink-900/70 border border-ink-800 shadow-plate px-6 py-12 sm:px-12 sm:py-16 text-center">
              <div className="absolute inset-0 hairline pointer-events-none" />
              <div className="absolute -bottom-32 left-1/2 -translate-x-1/2 w-[32rem] h-64 max-w-full bg-amber-500/10 blur-[100px] pointer-events-none" />
              <Corners />
              <h2 className="relative font-display text-3xl sm:text-5xl font-light leading-tight text-ink-100 text-balance">
                Try it on your own photos
              </h2>
              <p className="relative mt-4 text-ink-400 max-w-md mx-auto leading-relaxed">
                Sign up for free and get 3 restorations a day.
              </p>
              <div className="relative mt-8 flex justify-center">
                <Button onClick={onSignUp} icon={ArrowRight}>Restore a photo</Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-ink-800/80">
        <div className="container mx-auto max-w-7xl px-5 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 font-mono text-[10px] uppercase tracking-widest text-ink-600">
          <span>NanoRewind</span>
          <span>Powered by Google Gemini</span>
        </div>
      </footer>
    </div>
  );
};
