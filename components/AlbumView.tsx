import React, { useEffect, useState } from 'react';
import { Restoration } from '../types';
import { ArchiveState } from '../hooks/useArchive';
import { treatmentLabel } from './PromptSelector';
import { Button } from './Button';
import { Modal, Notice } from './Modal';
import { downloadImage, restoredFilename } from '../utils/image';

interface AlbumViewProps {
  archive: ArchiveState;
  activeId: string | null;
  canSelect: boolean;
  onSelect: (r: Restoration) => void;
  onDelete: (id: string) => Promise<void>;
  onShare: (r: Restoration) => void;
  onRestoreNew: () => void;
}

const displayName = (r: Restoration) =>
  (r.originalName ?? '').replace(/\.[^./\\]+$/, '') || 'Untitled photo';

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

const linkCls = 'text-bone-2 underline decoration-rule decoration-[1.5px] underline-offset-4 hover:text-bone hover:decoration-bone-3 disabled:opacity-50 disabled:no-underline';

const Grid: React.FC<{ children: React.ReactNode; busy?: boolean }> = ({ children, busy }) => (
  <ul aria-busy={busy || undefined} className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-x-7 gap-y-12 md:gap-x-11 md:gap-y-14">
    {children}
  </ul>
);

// The empty slot at the end of the album.
const EmptySlot: React.FC<{ label: string; onClick: () => void }> = ({ label, onClick }) => (
  <li>
    <button type="button" onClick={onClick}
      className="mount grid place-items-center w-full aspect-[4/5] px-4 bg-panel text-bone-2 hover:text-bone transition-colors text-center">
      <span className="max-w-[12ch]">{label}</span>
    </button>
  </li>
);

export const AlbumView: React.FC<AlbumViewProps> = ({
  archive, activeId, canSelect, onSelect, onDelete, onShare, onRestoreNew,
}) => {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Restoration | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const { items, status, error, hasMore, isLoadingMore } = archive;

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(t);
  }, [notice]);

  const download = async (r: Restoration) => {
    if (!r.restoredUrl || downloadingId) return;
    setDownloadingId(r.id);
    try {
      await downloadImage(r.restoredUrl, restoredFilename(r.originalName));
    } catch (err) {
      setNotice({ tone: 'error', text: (err as Error).message || 'The download failed. Try again.' });
    } finally {
      setDownloadingId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!confirmDelete) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await onDelete(confirmDelete.id);
      setConfirmDelete(null);
    } catch (err) {
      setDeleteError((err as Error).message || 'The photo could not be deleted. Try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  let body: React.ReactNode;
  if (status === 'loading' || status === 'idle') {
    body = (
      <Grid busy>
        {Array.from({ length: 8 }).map((_, i) => (
          <li key={i} aria-hidden="true">
            <div className="mount aspect-[4/5] bg-panel animate-breathe" style={{ animationDelay: `${i * 90}ms` }} />
            <div className="mt-4 h-3.5 w-3/4 rounded-sm bg-panel animate-breathe" style={{ animationDelay: `${i * 90}ms` }} />
            <div className="mt-2 h-3 w-1/2 rounded-sm bg-panel animate-breathe" style={{ animationDelay: `${i * 90}ms` }} />
          </li>
        ))}
      </Grid>
    );
  } else if (status === 'error') {
    body = (
      <div className="py-16 flex flex-col items-start gap-4 max-w-md">
        <h2 className="font-display text-2xl">Your album couldn't be opened</h2>
        <p className="text-bone-2">{error}</p>
        <Button variant="quiet" onClick={archive.reload}>Try again</Button>
      </div>
    );
  } else if (items.length === 0) {
    body = (
      <>
        <p className="text-bone-2 -mt-4">Nothing here yet. Every photo you restore is saved here on its own.</p>
        <Grid><EmptySlot label="Restore your first photo" onClick={onRestoreNew} /></Grid>
      </>
    );
  } else {
    body = (
      <>
        <Grid>
          {items.map((r) => {
            const isActive = r.id === activeId;
            const isBroken = !r.originalUrl || !r.restoredUrl;
            const name = displayName(r);
            return (
              <li key={r.id} className="min-w-0">
                <button
                  type="button"
                  onClick={() => onSelect(r)}
                  disabled={!canSelect || isBroken}
                  aria-label={isBroken ? `${name}: the image files are missing` : `Open ${name}`}
                  className={`mount block w-full outline outline-2 outline-offset-[8px] disabled:cursor-not-allowed
                    ${isActive ? 'outline-brass' : 'outline-transparent'}`}
                >
                  {isBroken ? (
                    <span className="grid place-items-center w-full aspect-[4/5] bg-panel text-bone-3 text-[15px] px-4 text-center">
                      The image files are missing
                    </span>
                  ) : (
                    <img src={r.restoredUrl!} alt="" loading="lazy" decoding="async" draggable={false}
                      className="block w-full aspect-[4/5] object-cover bg-panel" />
                  )}
                </button>
                <div className="mt-4 text-[15px] min-w-0">
                  <p className="font-bold truncate">{name}</p>
                  <p className="text-bone-2 truncate">{treatmentLabel(r)}, {formatDate(r.createdAt)}</p>
                  {(isActive || r.shareId) && (
                    <p className="text-brass truncate">
                      {[isActive && 'Open in Restore', r.shareId && 'Shared with a link'].filter(Boolean).join('. ')}
                    </p>
                  )}
                </div>
                <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-[15px]">
                  {!isBroken && (
                    <>
                      <button type="button" className={linkCls} onClick={() => download(r)} disabled={downloadingId !== null}>
                        {downloadingId === r.id ? 'Downloading…' : 'Download'}
                      </button>
                      <button type="button" className={linkCls} onClick={() => onShare(r)}>Share</button>
                    </>
                  )}
                  <button type="button" className={`${linkCls} hover:!text-rust hover:!decoration-rust`}
                    onClick={() => { setDeleteError(null); setConfirmDelete(r); }}>
                    Delete
                  </button>
                </div>
              </li>
            );
          })}
          {!hasMore && <EmptySlot label="Restore another photo" onClick={onRestoreNew} />}
        </Grid>

        {(hasMore || error) && (
          <div className="flex flex-col items-center gap-3">
            {error && <p className="text-rust text-[15px]">{error}</p>}
            {hasMore && <Button variant="quiet" onClick={archive.loadMore} isLoading={isLoadingMore}>Show older photos</Button>}
          </div>
        )}
      </>
    );
  }

  return (
    <main id="main" tabIndex={-1} className="flex-1 mx-auto w-full max-w-[1440px] px-4 sm:px-9 pt-10 pb-24 flex flex-col gap-9 outline-none">
      <div className="flex flex-col gap-2.5">
        <h1 className="font-display text-[clamp(38px,5vw,58px)] leading-none">Album</h1>
        <p className="text-bone-2">
          Your restorations, newest first. Only you can see them unless you share a link.
          {status === 'ready' && items.length > 0 && ` ${items.length}${hasMore ? '+' : ''} saved.`}
        </p>
      </div>

      {(!canSelect || notice) && (
        <div className="flex flex-col gap-2 max-w-2xl">
          {!canSelect && <Notice tone="ok">A restoration is running. You can open photos from here when it finishes.</Notice>}
          {notice && <Notice tone={notice.tone}>{notice.text}</Notice>}
        </div>
      )}

      {body}

      {confirmDelete && (
        <Modal title="Delete this photo?" size="sm" busy={isDeleting} onClose={() => setConfirmDelete(null)}>
          <p className="text-bone-2 mb-5">
            The original and the restored copy of <b className="text-bone">{displayName(confirmDelete)}</b> will be deleted for good.
            {confirmDelete.shareId && ' Its share link will stop working.'}
          </p>
          {deleteError && <Notice tone="error" className="mb-5">{deleteError}</Notice>}
          <div className="flex gap-3">
            <Button variant="quiet" className="flex-1" disabled={isDeleting} onClick={() => setConfirmDelete(null)}>Cancel</Button>
            <Button variant="danger" className="flex-1" isLoading={isDeleting} onClick={handleConfirmDelete}>Delete</Button>
          </div>
        </Modal>
      )}
    </main>
  );
};
