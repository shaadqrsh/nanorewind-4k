import React, { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  title: string;
  onClose?: () => void;          // omit for dialogs that must be answered
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  busy?: boolean;                // blocks closing while something is saving
  z?: string;
}

const widths = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg' };

// The one dialog shell: a solid scrim, a raised panel, a title and a close button.
// Escape closes it; the listener runs in the capture phase and stops there, so a
// dialog on top of another view only closes itself.
export const Modal: React.FC<ModalProps> = ({ title, onClose, children, size = 'md', busy = false, z = 'z-[100]' }) => {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || !onClose) return;
      e.stopPropagation();
      if (!busy) onClose();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [busy, onClose]);

  // Move focus into the dialog so keyboard users start inside it.
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel || panel.contains(document.activeElement)) return;
    const first = panel.querySelector<HTMLElement>('input, button:not([data-close]), a[href], textarea, select');
    (first ?? panel).focus();
  }, []);

  return (
    <div
      className={`fixed inset-0 ${z} flex items-center justify-center bg-cover/85 p-4 animate-fade-in`}
      onMouseDown={(e) => { if (e.target === e.currentTarget && onClose && !busy) onClose(); }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`relative w-full ${widths[size]} max-h-[90vh] overflow-y-auto bg-panel border border-rule rounded-md p-6 sm:p-7 outline-none`}
      >
        {onClose && (
          <button
            type="button"
            data-close
            onClick={onClose}
            disabled={busy}
            aria-label="Close"
            className="absolute top-4 right-4 grid place-items-center w-9 h-9 rounded-full text-bone-3 hover:text-bone hover:bg-page transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
        <h2 id={titleId} className="font-display text-[26px] leading-tight pr-10 mb-3">{title}</h2>
        {children}
      </div>
    </div>
  );
};

// A short status line inside a dialog or panel.
export const Notice: React.FC<{ tone: 'ok' | 'error'; children: React.ReactNode; className?: string }> = ({ tone, children, className = '' }) => (
  <p role={tone === 'error' ? 'alert' : 'status'}
    className={`px-3.5 py-2.5 rounded text-[15px] leading-snug border ${tone === 'ok'
      ? 'bg-sage/10 text-sage border-sage/30'
      : 'bg-rust/10 text-rust border-rust/35'} ${className}`}>
    {children}
  </p>
);
