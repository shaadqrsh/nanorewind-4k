import React, { useEffect, useState } from 'react';
import { X, Link2, Copy, Check, ExternalLink, Send } from 'lucide-react';
import { Restoration, shareUrl } from '../types';
import { Button } from './Button';
import { shareImage, restoredFilename } from '../utils/image';

interface ShareDialogProps {
  restoration: Restoration;
  onSetShared: (shared: boolean) => Promise<string | null>;
  onClose: () => void;
}

// Create, copy or turn off a restoration's public link, or send the file itself.
export const ShareDialog: React.FC<ShareDialogProps> = ({ restoration, onSetShared, onClose }) => {
  const [shareId, setShareId] = useState(restoration.shareId);
  const [busy, setBusy] = useState<'link' | 'file' | null>(null);
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  // Escape closes only this dialog: it can sit on top of the archive, which also
  // listens for Escape. Capturing first and stopping the event keeps the
  // archive open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      if (!busy) onClose();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [busy, onClose]);

  const url = shareId ? shareUrl(shareId) : null;

  const toggle = async (shared: boolean) => {
    setBusy('link');
    setMessage(null);
    setCopied(false);
    try {
      setShareId(await onSetShared(shared));
      if (!shared) setMessage({ tone: 'ok', text: 'Link turned off. Anyone who has it now sees "link not available".' });
    } catch (err) {
      setMessage({ tone: 'error', text: (err as Error).message || 'Something went wrong' });
    } finally {
      setBusy(null);
    }
  };

  const copy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setMessage({ tone: 'error', text: 'Could not copy. Select the link and copy it by hand.' });
    }
  };

  const sendFile = async () => {
    if (!restoration.restoredUrl) return;
    setBusy('file');
    setMessage(null);
    try {
      const outcome = await shareImage(restoration.restoredUrl, restoredFilename(restoration.originalName));
      if (outcome === 'copied') setMessage({ tone: 'ok', text: 'Image copied to clipboard.' });
    } catch (err) {
      setMessage({ tone: 'error', text: (err as Error).message || 'Something went wrong' });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-ink-950/85 backdrop-blur-sm p-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-labelledby="share-title"
        className="relative w-full max-w-md bg-ink-900 border border-ink-700 shadow-plate p-6 sm:p-7 animate-rise">
        <div className="absolute inset-0 hairline pointer-events-none" />
        <button onClick={onClose} aria-label="Close" className="absolute top-4 right-4 p-1 text-ink-500 hover:text-ink-200 transition-colors">
          <X className="w-5 h-5" />
        </button>

        <h2 id="share-title" className="font-display text-xl font-semibold text-ink-100 mb-2 pr-8">Share this photo</h2>

        {url ? (
          <>
            <p className="text-sm text-ink-400 leading-relaxed mb-4">
              Anyone with this link can compare the original and restored photo.
            </p>
            <div className="flex gap-2 mb-3">
              <input readOnly value={url} aria-label="Share link" onFocus={(e) => e.currentTarget.select()}
                className="flex-1 min-w-0 bg-ink-950 border border-ink-700 px-3 py-2 font-mono text-[12px] text-ink-200 outline-none focus:border-amber-500/60" />
              <Button onClick={copy} icon={copied ? Check : Copy} className="!py-2 !px-4 shrink-0">
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>
            <div className="flex items-center justify-between gap-3 mb-5">
              <a href={url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-ink-400 hover:text-amber-400 transition-colors">
                <ExternalLink className="w-3 h-3" /> Open link
              </a>
              <button onClick={() => toggle(false)} disabled={busy !== null}
                className="font-mono text-[10px] uppercase tracking-widest text-rust-400 hover:text-rust-500 disabled:opacity-40 transition-colors">
                {busy === 'link' ? 'Turning off…' : 'Turn off link'}
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-ink-400 leading-relaxed mb-3">
              Create a link anyone can open to compare the original and restored photo.
            </p>
            <p className="text-xs text-ink-500 leading-relaxed mb-5">
              The link isn't listed anywhere and search engines are asked not to index it. Your name and the
              file name aren't shown. You can turn it off at any time.
            </p>
            <Button onClick={() => toggle(true)} isLoading={busy === 'link'} icon={Link2} className="w-full mb-5">
              Create link
            </Button>
          </>
        )}

        {message && (
          <p role="status" className={`mb-5 px-3 py-2 text-xs border ${message.tone === 'ok'
            ? 'bg-patina-500/10 text-patina-400 border-patina-500/30'
            : 'bg-rust-500/10 text-rust-400 border-rust-500/30'}`}>
            {message.text}
          </p>
        )}

        {restoration.restoredUrl && (
          <div className="pt-4 border-t border-ink-800">
            <button onClick={sendFile} disabled={busy !== null}
              className="flex items-center gap-2 text-sm text-ink-300 hover:text-amber-400 disabled:opacity-40 transition-colors">
              <Send className="w-4 h-4" /> {busy === 'file' ? 'Preparing…' : 'Send the image file instead'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
