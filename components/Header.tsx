import React, { useState } from 'react';
import { History, LogOut, AlertTriangle, Settings } from 'lucide-react';
import { Countdown } from './Countdown';
import { User } from '../types';

interface HeaderProps {
  user: User | null;
  quota: { remaining: number; allowed: boolean; nextReset?: number } | null;
  onLogout: () => void;
  onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({ user, quota, onLogout, onOpenSettings }) => {
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const remaining = quota?.remaining ?? 0;
  const total = 3;

  return (
    <>
      <header className="relative shrink-0 border-b border-ink-800/80 bg-ink-950/70 backdrop-blur-xl">
        {/* safelight hairline */}
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />

        <div className="container mx-auto max-w-7xl px-5 h-[72px] flex items-center justify-between">

          {/* Masthead */}
          <div className="flex items-center gap-3.5">
            <div className="relative grid place-items-center w-11 h-11 bg-ink-900 border border-ink-700 shadow-safelight">
              <div className="absolute inset-0 bg-amber-500/5 animate-safelight-pulse" />
              <History className="relative w-5 h-5 text-amber-500" strokeWidth={2} />
              {/* corner registration marks */}
              <span className="absolute top-1 left-1 w-1 h-1 border-t border-l border-ink-600" />
              <span className="absolute bottom-1 right-1 w-1 h-1 border-b border-r border-ink-600" />
            </div>
            <div className="flex flex-col">
              <h1 className="font-display text-[22px] leading-none font-semibold text-ink-100 tracking-tight">
                NanoRewind
              </h1>
              <span className="mt-1 font-mono text-[9px] uppercase tracking-widest text-ink-500">
                AI Photo Restoration · 4K
              </span>
            </div>
          </div>

          {/* Controls */}
          {user && (
            <div className="flex items-center gap-4 sm:gap-6">

              {/* Exposures-remaining gauge */}
              <div className="flex flex-col items-end">
                <div className="flex items-center gap-1.5 min-h-[14px]">
                  {quota?.nextReset ? (
                    <>
                      <span className="font-mono text-[9px] uppercase tracking-widest text-ink-500">Resets in</span>
                      <Countdown targetDate={quota.nextReset} className="text-ink-400" />
                    </>
                  ) : (
                    <span className="font-mono text-[9px] uppercase tracking-widest text-patina-400">Credits full</span>
                  )}
                </div>
                <div className="mt-1.5 flex items-center gap-2.5" title={`${remaining} of ${total} daily credits left`}>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: total }).map((_, i) => (
                      <span
                        key={i}
                        className={`h-3.5 w-1 ${
                          i < remaining
                            ? 'bg-amber-500 shadow-[0_0_6px_rgba(224,164,88,0.6)]'
                            : 'bg-ink-700'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="font-mono text-[11px] tabular-nums text-ink-400">
                    <span className={quota?.allowed ? 'text-amber-400' : 'text-rust-400'}>{remaining}</span>
                    <span className="text-ink-600">/{total}</span>
                  </span>
                </div>
              </div>

              <div className="h-8 w-px bg-ink-800 hidden sm:block" />

              <div className="flex items-center gap-3">
                <div className="hidden sm:flex flex-col items-end leading-tight">
                  <span className="font-mono text-[9px] uppercase tracking-widest text-ink-500">Signed in as</span>
                  <span className="text-sm text-ink-200 max-w-[150px] truncate">
                    {user.name || user.email.split('@')[0]}
                  </span>
                </div>

                <button
                  onClick={onOpenSettings}
                  className="p-2.5 text-ink-400 hover:text-amber-400 border border-transparent hover:border-ink-700 transition-colors"
                  title="Settings"
                >
                  <Settings className="w-[18px] h-[18px]" />
                </button>

                <button
                  onClick={() => setShowLogoutConfirm(true)}
                  className="p-2.5 text-ink-400 hover:text-rust-400 border border-transparent hover:border-rust-500/40 transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="w-[18px] h-[18px]" />
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-ink-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-ink-900 border border-ink-700 shadow-plate p-6 animate-rise">
            <div className="flex items-center gap-3 mb-4">
              <div className="grid place-items-center w-10 h-10 bg-rust-500/10 border border-rust-500/30">
                <AlertTriangle className="w-5 h-5 text-rust-400" />
              </div>
              <h3 className="font-display text-xl font-semibold text-ink-100">Sign out?</h3>
            </div>
            <p className="text-ink-400 text-sm mb-6 leading-relaxed">
              You'll be signed out and your current photo cleared.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-2.5 font-mono text-[12px] uppercase tracking-widest bg-ink-800 border border-ink-700 text-ink-200 hover:bg-ink-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => { onLogout(); setShowLogoutConfirm(false); }}
                className="flex-1 py-2.5 font-mono text-[12px] uppercase tracking-widest bg-transparent border border-rust-500/40 text-rust-400 hover:bg-rust-500/10 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
