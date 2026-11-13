import React, { useEffect, useState } from 'react';
import { X, Archive, Download, Share2, Trash2, AlertCircle, AlertTriangle, Loader2, ImageOff, RotateCw, Link2 } from 'lucide-react';
import { Restoration } from '../types';
import { ArchiveState } from '../hooks/useArchive';
import { PROCESSES, MODIFIERS } from './PromptSelector';
import { Button } from './Button';
import { downloadImage, restoredFilename } from '../utils/image';

interface ArchiveViewProps {
  isOpen: boolean;
  onClose: () => void;
  archive: ArchiveState;
  activeId: string | null;
  canSelect: boolean;
  onSelect: (r: Restoration) => void;
  onDelete: (id: string) => Promise<void>;
  onShare: (r: Restoration) => void;
}

type Busy = { id: string; action: 'download' } | null;
type Notice = { tone: 'ok' | 'error'; text: string } | null;

const processOf = (r: Restoration) => PROCESSES.find(p => p.key === r.process) ?? PROCESSES[0];

const treatmentLabel = (r: Restoration) =>
  [processOf(r).label, ...MODIFIERS.filter(m => r[m.key]).map(m => m.label)].join(', ');

const displayName = (r: Restoration) =>
  (r.originalName ?? '').replace(/\.[^./\\]+$/, '') || 'Untitled photo';

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

export const ArchiveView: React.FC<ArchiveViewProps> = ({
  isOpen, onClose, archive, activeId, canSelect, onSelect, onDelete, onShare,
}) => {
  const [busy, setBusy] = useState<Busy>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [confirmDelete, setConfirmDelete] = useState<Restoration | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Escape closes the delete dialog first, then the archive.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || isDeleting) return;
      if (confirmDelete) setConfirmDelete(null);
      else onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, confirmDelete, isDeleting, onClose]);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 3500);
    return () => clearTimeout(t);
  }, [notice]);

  if (!isOpen) return null;

  const { items, status, error, hasMore, isLoadingMore } = archive;

  const runAction = async (r: Restoration, action: 'download') => {
    if (!r.restoredUrl || busy) return;
    setBusy({ id: r.id, action });
    try {
      await downloadImage(r.restoredUrl, restoredFilename(r.originalName));
    } catch (err) {
      setNotice({ tone: 'error', text: (err as Error).message || 'Something went wrong' });
    } finally {
      setBusy(null);
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
      setDeleteError((err as Error).message || 'Delete failed');
    } finally {
      setIsDeleting(false);
    }
  };

  const countLabel =
    status === 'ready'
      ? `${items.length}${hasMore ? '+' : ''} saved, newest first`
      : 'your restorations';

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-ink-950/85 backdrop-blur-sm p-3 sm:p-6"
      onMouseDown={(e) => { if (e.target === e.currentTarget && !isDeleting) onClose(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Archive"
        className="relative w-full max-w-5xl h-[min(88vh,920px)] bg-ink-900 border border-ink-700 shadow-plate flex flex-col animate-rise"
      >
        <div className="absolute inset-0 hairline pointer-events-none" />

        {/* Header */}
        <header className="flex items-center justify-between gap-4 px-5 py-4 border-b border-ink-800 shrink-0">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="relative grid place-items-center w-10 h-10 shrink-0 bg-ink-950 border border-ink-700">
              <Archive className="w-[18px] h-[18px] text-amber-500" strokeWidth={2} />
              <span className="absolute top-1 left-1 w-1 h-1 border-t border-l border-ink-600" />
              <span className="absolute bottom-1 right-1 w-1 h-1 border-b border-r border-ink-600" />
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-lg font-semibold text-ink-100 leading-tight">Archive</h2>
              <p className="mt-0.5 font-mono text-[9px] uppercase tracking-widest text-ink-500 truncate">{countLabel}</p>
            </div>
          </div>
          <button onClick={onClose} title="Close" className="p-2 text-ink-500 hover:text-ink-200 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* Notices */}
        {(notice || !canSelect) && (
          <div className="px-5 pt-4 shrink-0 space-y-2">
            {!canSelect && (
              <p className="px-3 py-2 text-xs font-mono border bg-amber-500/[0.06] text-amber-400 border-amber-500/30">
                A restoration is in progress. You can open saved photos when it finishes.
              </p>
            )}
            {notice && (
              <p className={`px-3 py-2 text-xs font-mono border flex items-center gap-2 ${
                notice.tone === 'ok'
                  ? 'bg-patina-500/10 text-patina-400 border-patina-500/30'
                  : 'bg-rust-500/10 text-rust-400 border-rust-500/30'
              }`}>
                <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />
                {notice.text}
              </p>
            )}
          </div>
        )}

        {/* Body */}
        <div className="flex-grow overflow-y-auto p-5">
          {status === 'loading' || status === 'idle' ? (
            <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4" aria-busy="true">
              {Array.from({ length: 8 }).map((_, i) => (
                <li key={i}>
                  <div className="aspect-[4/5] bg-ink-850 border border-ink-800 animate-pulse" style={{ animationDelay: `${i * 80}ms` }} />
                  <div className="mt-2.5 h-3 w-3/4 bg-ink-850 animate-pulse" />
                  <div className="mt-1.5 h-2 w-1/2 bg-ink-850 animate-pulse" />
                </li>
              ))}
            </ul>
          ) : status === 'error' ? (
            <div className="h-full grid place-items-center text-center p-8">
              <div>
                <AlertCircle className="w-6 h-6 text-rust-400 mx-auto mb-4" />
                <p className="font-display text-lg text-ink-200">Couldn't open the archive</p>
                <p className="font-mono text-[10px] uppercase tracking-widest text-ink-500 mt-1.5 mb-6">{error}</p>
                <Button onClick={archive.reload} variant="secondary" icon={RotateCw}>Try again</Button>
              </div>
            </div>
          ) : items.length === 0 ? (
            <div className="h-full grid place-items-center text-center p-8">
              <div>
                <div className="relative inline-grid place-items-center w-14 h-14 mb-5 border border-ink-700">
                  <Archive className="w-6 h-6 text-ink-600" strokeWidth={1.5} />
                  <span className="absolute -top-px -left-px w-2 h-2 border-t border-l border-amber-500/40" />
                  <span className="absolute -bottom-px -right-px w-2 h-2 border-b border-r border-amber-500/40" />
                </div>
                <p className="font-display text-lg text-ink-300">No restorations yet</p>
                <p className="font-mono text-[10px] uppercase tracking-widest text-ink-600 mt-1.5">
                  restored photos are saved here automatically
                </p>
              </div>
            </div>
          ) : (
            <>
              <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-6">
                {items.map((r) => {
                  const isActive = r.id === activeId;
                  const isBroken = !r.originalUrl || !r.restoredUrl;
                  const process = processOf(r);
                  return (
                    <li key={r.id} className="group relative min-w-0">
                      <button
                        type="button"
                        onClick={() => onSelect(r)}
                        disabled={!canSelect || isBroken}
                        title={isBroken ? 'Image files are missing' : `Open ${displayName(r)}`}
                        className="block w-full text-left disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-900"
                      >
                        <div className={`relative aspect-[4/5] overflow-hidden bg-ink-950 border transition-colors
                          ${isActive ? 'border-amber-500/70' : 'border-ink-700 group-hover:border-amber-500/40'}`}>
                          {isBroken ? (
                            <div className="absolute inset-0 grid place-items-center text-ink-600">
                              <ImageOff className="w-6 h-6" strokeWidth={1.5} />
                            </div>
                          ) : (
                            <>
                              {/* Before/after split; the divider sweeps to "after" on hover */}
                              <img src={r.restoredUrl!} alt="" loading="lazy" decoding="async" draggable={false}
                                className="absolute inset-0 w-full h-full object-cover" />
                              <img src={r.originalUrl!} alt="" loading="lazy" decoding="async" draggable={false}
                                className="absolute inset-0 w-full h-full object-cover [clip-path:inset(0_50%_0_0)] group-hover:[clip-path:inset(0_100%_0_0)] transition-[clip-path] duration-500 ease-out" />
                              <span className="absolute inset-y-0 left-1/2 group-hover:left-0 w-px bg-amber-500/80 shadow-[0_0_8px_rgba(224,164,88,0.6)] transition-all duration-500 ease-out pointer-events-none" />
                              <span className="absolute bottom-1.5 left-1.5 font-mono text-[8px] uppercase tracking-widest text-ink-300 bg-ink-950/70 px-1 py-0.5 group-hover:opacity-0 transition-opacity">Before</span>
                              <span className="absolute bottom-1.5 right-1.5 font-mono text-[8px] uppercase tracking-widest text-ink-950 bg-amber-500 px-1 py-0.5">After</span>
                            </>
                          )}

                          <span title={treatmentLabel(r)}
                            className="absolute top-1.5 left-1.5 font-mono text-[9px] tracking-wider px-1.5 py-0.5 bg-ink-950/80 border border-ink-600 text-ink-300">
                            {process.code}
                          </span>
                          <div className="absolute top-8 left-1.5 flex flex-col items-start gap-1">
                            {isActive && (
                              <span className="font-mono text-[8px] uppercase tracking-widest px-1.5 py-0.5 bg-amber-500 text-ink-950">
                                Viewing
                              </span>
                            )}
                            {r.shareId && (
                              <span title="Has a public link" className="flex items-center gap-1 font-mono text-[8px] uppercase tracking-widest px-1.5 py-0.5 bg-ink-950/85 border border-patina-500/50 text-patina-400">
                                <Link2 className="w-2.5 h-2.5" /> Shared
                              </span>
                            )}
                          </div>
                        </div>

                        <p className="mt-2.5 text-[12px] font-medium text-ink-200 truncate">{displayName(r)}</p>
                        <p className="mt-0.5 text-[11px] text-ink-400 truncate">{treatmentLabel(r)}</p>
                        <p className="mt-1 font-mono text-[9px] uppercase tracking-widest text-ink-500 truncate">
                          {formatDate(r.createdAt)}
                        </p>
                      </button>

                      {/* Actions: revealed on hover/focus, always visible on touch screens */}
                      <div className="absolute top-1.5 right-1.5 flex flex-col gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity">
                        {!isBroken && (
                          <>
                            <ActionButton label="Download" onClick={() => runAction(r, 'download')}
                              busy={busy?.id === r.id && busy.action === 'download'} Icon={Download} />
                            <ActionButton label="Share" onClick={() => onShare(r)} Icon={Share2} />
                          </>
                        )}
                        <ActionButton label="Delete" tone="danger" Icon={Trash2}
                          onClick={() => { setDeleteError(null); setConfirmDelete(r); }} />
                      </div>
                    </li>
                  );
                })}
              </ul>

              {(hasMore || error) && (
                <div className="mt-8 flex flex-col items-center gap-3">
                  {error && <p className="font-mono text-[10px] uppercase tracking-widest text-rust-400">{error}</p>}
                  {hasMore && (
                    <Button onClick={archive.loadMore} isLoading={isLoadingMore} variant="outline" className="!py-2 !px-5">
                      Load older
                    </Button>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Delete confirmation */}
        {confirmDelete && (
          <div className="absolute inset-0 z-10 grid place-items-center bg-ink-950/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm bg-ink-900 border border-ink-700 shadow-plate p-6 animate-rise">
              <div className="flex items-center gap-3 mb-4">
                <div className="grid place-items-center w-10 h-10 bg-rust-500/10 border border-rust-500/30">
                  <AlertTriangle className="w-5 h-5 text-rust-400" />
                </div>
                <h3 className="font-display text-lg font-semibold text-ink-100">Delete this restoration?</h3>
              </div>
              <p className="text-ink-400 text-sm mb-5 leading-relaxed">
                The original and restored images of <span className="text-ink-200">{displayName(confirmDelete)}</span> will
                be permanently removed.
              </p>
              {deleteError && (
                <p className="mb-4 px-3 py-2 text-xs font-mono border bg-rust-500/10 text-rust-400 border-rust-500/30">{deleteError}</p>
              )}
              <div className="flex gap-2">
                <Button onClick={() => setConfirmDelete(null)} disabled={isDeleting} variant="secondary" className="flex-1 !py-2 !px-4">
                  Cancel
                </Button>
                <Button onClick={handleConfirmDelete} isLoading={isDeleting} variant="danger" className="flex-1 !py-2 !px-4">
                  Delete
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const ActionButton: React.FC<{
  label: string;
  Icon: typeof Download;
  onClick: () => void;
  busy?: boolean;
  tone?: 'default' | 'danger';
}> = ({ label, Icon, onClick, busy, tone = 'default' }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={busy}
    title={label}
    aria-label={label}
    className={`grid place-items-center w-7 h-7 bg-ink-950/85 border border-ink-600 text-ink-300 transition-colors
      focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/60
      ${tone === 'danger' ? 'hover:text-rust-400 hover:border-rust-500/50' : 'hover:text-amber-400 hover:border-amber-500/50'}`}
  >
    {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Icon className="w-3.5 h-3.5" />}
  </button>
);
