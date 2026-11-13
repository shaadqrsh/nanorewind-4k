import React from 'react';

// "NanoRewind 4K", with the 4K in brass. Rendered as plain text so each page
// keeps its own <h1>.
export const Wordmark: React.FC<{ className?: string }> = ({ className = 'text-2xl' }) => (
  <span className={`font-display leading-none whitespace-nowrap ${className}`}>
    NanoRewind <span className="text-brass">4K</span>
  </span>
);
