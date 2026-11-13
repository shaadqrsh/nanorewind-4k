import React from 'react';

// The logo: a print split into faded and restored halves, held in photo
// corners. Same drawing as public/favicon.svg.
export const LogoMark: React.FC<{ className?: string }> = ({ className = 'w-8 h-8' }) => (
  <svg viewBox="0 0 64 64" className={`shrink-0 ${className}`} aria-hidden="true" focusable="false">
    <rect width="64" height="64" rx="14" fill="#2b1517" stroke="#4a2a2c" strokeWidth="2" />
    <rect x="13" y="13" width="19" height="38" fill="#8c6a5f" />
    <rect x="32" y="13" width="19" height="38" fill="#f0e5d7" />
    <rect x="31" y="13" width="2" height="38" fill="#2b1517" />
    <g fill="#e3a95e">
      <path d="M10 10h12L10 22z" />
      <path d="M54 10v12L42 10z" />
      <path d="M10 54V42l12 12z" />
      <path d="M54 54H42l12-12z" />
    </g>
  </svg>
);

// "NanoRewind 4K" with the logo, and the 4K in brass. Rendered as plain text
// so each page keeps its own <h1>.
export const Wordmark: React.FC<{ className?: string; mark?: boolean }> = ({ className = 'text-2xl', mark = true }) => (
  <span className={`inline-flex items-center gap-[0.45em] font-display leading-none whitespace-nowrap ${className}`}>
    {mark && <LogoMark className="w-[1.4em] h-[1.4em]" />}
    <span>NanoRewind <span className="text-brass">4K</span></span>
  </span>
);
