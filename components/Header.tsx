import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Countdown } from './Countdown';
import { Wordmark } from './Wordmark';
import { Button } from './Button';
import { Modal } from './Modal';
import { User } from '../types';
import { linkTo, PATHS } from '../utils/routes';

export type AppView = 'restore' | 'album';

interface HeaderProps {
  user: User;
  quota: { remaining: number; allowed: boolean; nextReset?: number };
  view: AppView;
  onNavigate: (view: AppView) => void;
  onLogout: () => void;
  onOpenSettings: () => void;
}

const MAX_CREDITS = 3;

export const Header: React.FC<HeaderProps> = ({ user, quota, view, onNavigate, onLogout, onOpenSettings }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const displayName = user.name || user.email.split('@')[0];

  // Close the account menu on an outside click, on Escape (focus goes back to
  // the button), or when focus moves out of it.
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => { if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false); };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setMenuOpen(false);
      buttonRef.current?.focus();
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const tab = (v: AppView, label: string) => (
    <a
      href={v === 'album' ? PATHS.album : PATHS.home}
      onClick={(e) => {
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        onNavigate(v);
      }}
      aria-current={view === v ? 'page' : undefined}
      className={`px-3.5 py-2 rounded-full font-bold text-base transition-colors
        ${view === v ? 'bg-panel text-bone' : 'text-bone-2 hover:text-bone'}`}
    >
      {label}
    </a>
  );

  return (
    <>
      <header className="shrink-0 bg-cover border-b border-rule">
        {/* Phones: wordmark and Account on the first row, tabs and credits on the second. */}
        <div className="mx-auto max-w-[1440px] px-4 sm:px-9 min-h-16 py-2.5 flex flex-wrap items-center gap-x-7 gap-y-2">
          <a href={PATHS.home} onClick={linkTo('home')} aria-label="NanoRewind 4K, restore a photo" className="order-1">
            <Wordmark className="text-[22px] sm:text-2xl" />
          </a>

          <nav aria-label="App" className="flex gap-1.5 order-3 sm:order-2">
            {tab('restore', 'Restore')}
            {tab('album', 'Album')}
          </nav>

          {/* Only the count is announced when it changes, not the ticking countdown. */}
          <p className="order-4 sm:order-3 ml-auto text-[15px] leading-tight text-right">
              <span aria-live="polite">
                {quota.remaining > 0 ? (
                  <>
                    <b className="text-bone">{quota.remaining} of {MAX_CREDITS}</b>
                    <span className="text-bone-2"> <span className="hidden sm:inline">restorations </span>left</span>
                  </>
                ) : (
                  <b className="text-bone">None left</b>
                )}
              </span>
              {quota.nextReset ? (
                <span className="hidden md:inline text-bone-3"> &nbsp;Next one in <Countdown targetDate={quota.nextReset} /></span>
              ) : null}
          </p>

            <div ref={menuRef} className="relative order-2 sm:order-4 ml-auto sm:ml-0">
              <button
                ref={buttonRef}
                type="button"
                onClick={() => setMenuOpen(o => !o)}
                aria-expanded={menuOpen}
                aria-controls="account-menu"
                className="flex items-center gap-1.5 min-h-10 pl-[18px] pr-3.5 rounded-full border-[1.5px] border-bone-3 hover:border-bone font-bold text-[15px] transition-colors"
              >
                Account <ChevronDown className={`w-4 h-4 transition-transform ${menuOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
              </button>
              {menuOpen && (
                <div id="account-menu"
                  onBlur={(e) => { if (!menuRef.current?.contains(e.relatedTarget as Node)) setMenuOpen(false); }}
                  className="absolute right-0 top-[calc(100%+8px)] z-50 w-64 bg-panel border border-rule rounded-md py-2 animate-fade-in">
                  <div className="px-4 pt-1.5 pb-3 border-b border-rule mb-1.5">
                    <p className="font-bold truncate">{displayName}</p>
                    <p className="text-sm text-bone-3 truncate">{user.email}</p>
                  </div>
                  <button type="button" onClick={() => { setMenuOpen(false); buttonRef.current?.focus(); onOpenSettings(); }}
                    className="w-full text-left px-4 py-2.5 hover:bg-page transition-colors">
                    Settings
                  </button>
                  <button type="button" onClick={() => { setMenuOpen(false); buttonRef.current?.focus(); setConfirmLogout(true); }}
                    className="w-full text-left px-4 py-2.5 hover:bg-page text-rust transition-colors">
                    Sign out
                  </button>
                </div>
              )}
            </div>
        </div>
      </header>

      {confirmLogout && (
        <Modal title="Sign out?" size="sm" onClose={() => setConfirmLogout(false)}>
          <p className="text-bone-2 mb-6">This signs you out and clears the photo you have open. Your album stays saved.</p>
          <div className="flex gap-3">
            <Button variant="quiet" className="flex-1" onClick={() => setConfirmLogout(false)}>Cancel</Button>
            <Button variant="danger" className="flex-1" onClick={() => { setConfirmLogout(false); onLogout(); }}>Sign out</Button>
          </div>
        </Modal>
      )}
    </>
  );
};
