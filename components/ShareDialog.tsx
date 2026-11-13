import React, { useState } from 'react';
import { Restoration, shareUrl } from '../types';
import { Button } from './Button';
import { Modal, Notice } from './Modal';
import { shareImage, restoredFilename } from '../utils/image';

interface ShareDialogProps {
  restoration: Restoration;
  onSetShared: (shared: boolean) => Promise<string | null>;
  onClose: () => void;
}

const linkCls = 'text-bone-2 underline decoration-rule decoration-[1.5px] underline-offset-4 hover:text-bone hover:decoration-bone-3 disabled:opacity-50';

// Create, copy or turn off a restoration's public link, or send the file itself.
export const ShareDialog: React.FC<ShareDialogProps> = ({ restoration, onSetShared, onClose }) => {
  const [shareId, setShareId] = useState(restoration.shareId);
  const [busy, setBusy] = useState<'link' | 'file' | null>(null);
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  const url = shareId ? shareUrl(shareId) : null;

  const toggle = async (shared: boolean) => {
    setBusy('link');
    setMessage(null);
    setCopied(false);
    try {
      setShareId(await onSetShared(shared));
      if (!shared) setMessage({ tone: 'ok', text: 'Link turned off. Anyone who opens it now sees that it isn\'t available.' });
    } catch (err) {
      setMessage({ tone: 'error', text: (err as Error).message || 'Sharing could not be changed. Try again.' });
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
      setMessage({ tone: 'error', text: 'The link could not be copied. Select it and copy it by hand.' });
    }
  };

  const sendFile = async () => {
    if (!restoration.restoredUrl) return;
    setBusy('file');
    setMessage(null);
    try {
      const outcome = await shareImage(restoration.restoredUrl, restoredFilename(restoration.originalName));
      if (outcome === 'copied') setMessage({ tone: 'ok', text: 'Image copied to the clipboard.' });
    } catch (err) {
      setMessage({ tone: 'error', text: (err as Error).message || 'The image could not be sent. Try Download instead.' });
    } finally {
      setBusy(null);
    }
  };

  return (
    <Modal title="Share this photo" busy={busy !== null} onClose={onClose} z="z-[110]">
      {url ? (
        <>
          <p className="text-bone-2 mb-4">Anyone with this link can compare the original and the restored photo.</p>
          <div className="flex gap-2 mb-4">
            <input readOnly value={url} aria-label="Share link" onFocus={(e) => e.currentTarget.select()}
              className="flex-1 min-w-0 bg-cover border border-rule rounded px-3 py-2.5 font-mono text-sm text-bone outline-none focus:border-brass" />
            <Button size="sm" onClick={copy} className="shrink-0">{copied ? 'Copied' : 'Copy'}</Button>
          </div>
          <div className="flex items-center justify-between gap-3 mb-6 text-[15px]">
            <a href={url} target="_blank" rel="noopener noreferrer" className={linkCls}>Open the link</a>
            <button type="button" onClick={() => toggle(false)} disabled={busy !== null}
              className="text-rust underline decoration-rust/40 decoration-[1.5px] underline-offset-4 hover:decoration-rust disabled:opacity-50">
              {busy === 'link' ? 'Turning off…' : 'Turn off the link'}
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="text-bone-2 mb-3">Make a link that anyone can open to compare the original and the restored photo.</p>
          <p className="text-[15px] text-bone-3 mb-6">
            The link isn't listed anywhere, and search engines are asked not to index it. It doesn't show your name or the
            file name. You can turn it off at any time.
          </p>
          <Button onClick={() => toggle(true)} isLoading={busy === 'link'} className="w-full mb-6">Create a link</Button>
        </>
      )}

      {message && <Notice tone={message.tone} className="mb-6">{message.text}</Notice>}

      {restoration.restoredUrl && (
        <div className="pt-5 border-t border-rule text-[15px]">
          <button type="button" onClick={sendFile} disabled={busy !== null} className={linkCls}>
            {busy === 'file' ? 'Preparing the image…' : 'Send the image file instead'}
          </button>
        </div>
      )}
    </Modal>
  );
};
