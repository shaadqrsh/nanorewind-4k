import React from 'react';

// "The short version": a summary card held in photo corners at the top of each policy.
export const Summary: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <aside className="mount mount-sm mt-9 mb-12 bg-panel px-6 py-5 sm:px-8 sm:py-7" aria-label="The short version">
    <h2 className="!mt-0 !text-[22px]">The short version</h2>
    {children}
  </aside>
);

// External links on the policies open in the same tab, like the rest of the page.
export const Ext: React.FC<{ href: string; children: React.ReactNode }> = ({ href, children }) => (
  <a href={href} rel="noopener noreferrer">{children}</a>
);
