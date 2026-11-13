import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Dropzone } from './Dropzone';
import { BatchQueuePanel } from './BatchQueuePanel';
import { useBatchQueue } from '../hooks/useBatchQueue';
import { prepareUpload, toUploadData, UPLOAD_TYPES } from '../utils/image';
import { Header, AppView } from './Header';
import { RestoredView } from './RestoredView';
import { NewPasswordModal } from './NewPasswordModal';
import { ShareDialog } from './ShareDialog';
import { PromptSelector, PromptOptions, toPromptOptions, sameOptions, processLabel, treatmentLabel } from './PromptSelector';
import { SettingsModal } from './SettingsModal';
import { AlbumView } from './AlbumView';
import { Modal, Notice } from './Modal';
import { SAMPLE_BEFORE } from './PhotoSpread';
import { SiteFooter, SkipLink } from './SiteChrome';
import { restoreImage } from '../services/gemini';
import { authService, Quota } from '../services/auth';
import { archiveService } from '../services/archive';
import { useArchive } from '../hooks/useArchive';
import { ImageFile, Restoration, RestorationStatus, User } from '../types';
import { Button } from './Button';
import { Countdown } from './Countdown';

// Everything a signed-in user sees: the restore workspace, the album and the
// dialogs around them. Loaded on demand, so visitors to the home page don't
// download it. Signing out unmounts it, which drops all of this state.

interface WorkspaceProps {
  user: User;
  initialQuota: Quota;
  view: AppView;
  onNavigate: (view: AppView) => void;
  onUserChange: (updates: Partial<User>) => void;
  onSignOut: () => void;
  askNewPassword: boolean;        // a password-reset link signed the user in
  onNewPasswordDone: () => void;
}

const DEFAULT_OPTIONS: PromptOptions = { process: 'standard', chiaroscuro: false, matte: false };

const Workspace: React.FC<WorkspaceProps> = ({
  user, initialQuota, view, onNavigate, onUserChange, onSignOut, askNewPassword, onNewPasswordDone,
}) => {
  const [showSettings, setShowSettings] = useState(false);

  const [file, setFile] = useState<ImageFile | null>(null);
  const [promptOptions, setPromptOptions] = useState<PromptOptions>(DEFAULT_OPTIONS);
  // The treatment the result on screen was made with (null when unknown).
  const [resultOptions, setResultOptions] = useState<PromptOptions | null>(null);

  const [restoredImage, setRestoredImage] = useState<string | null>(null);
  const [status, setStatus] = useState<RestorationStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [quota, setQuota] = useState<Quota>(initialQuota);
  const [showZeroCreditsModal, setShowZeroCreditsModal] = useState(!initialQuota.allowed);

  const archive = useArchive();
  // Archive id of the result in the workspace; null for unsaved or no result.
  const [activeRestorationId, setActiveRestorationId] = useState<string | null>(null);
  // The restoration whose share dialog is open. Looked up in the archive so the
  // dialog sees link changes straight away.
  const [shareTargetId, setShareTargetId] = useState<string | null>(null);
  const shareTarget = shareTargetId ? archive.items.find(r => r.id === shareTargetId) ?? null : null;

  // Batch mode: several photos queued at once. The result pane shows the
  // selected queue item through the same state as a single upload (file,
  // restoredImage, status, activeRestorationId). null = not viewing the queue.
  const batch = useBatchQueue();
  const inBatch = batch.items.length > 0;
  const [selectedQueueId, setSelectedQueueId] = useState<string | null>(null);
  const selectedItem = selectedQueueId ? batch.items.find(i => i.id === selectedQueueId) ?? null : null;
  const batchOptions = useRef<PromptOptions | null>(null);
  const replaceRef = useRef<HTMLInputElement>(null);
  const addMoreRef = useRef<HTMLInputElement>(null);

  // A batch must not keep restoring (and spending credits) after sign-out.
  const stopBatch = batch.stop;
  useEffect(() => () => stopBatch(), [stopBatch]);

  const refreshQuota = useCallback(async () => {
    const q = await authService.checkQuota();
    setQuota(q);
    return q;
  }, []);

  // Load the album when it's opened (by the tab, a link or the Back button).
  useEffect(() => {
    if (view === 'album') archive.ensureFresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  const handleReset = () => {
    setFile(null);
    setRestoredImage(null);
    setStatus('idle');
    setError(null);
    setActiveRestorationId(null);
    setResultOptions(null);
  };

  // One photo: the single-photo flow, replacing what's open. Several, or "add
  // more" next to an open photo: the queue. Large photos are shrunk first.
  const handleFilesSelect = useCallback(async (files: File[], addToCurrent = false) => {
    setError(null);
    refreshQuota(); // credits may have refilled since the page loaded
    const prepared: ImageFile[] = [];
    for (const f of files) {
      try {
        prepared.push(await prepareUpload(f));
      } catch (err) {
        setError(`${f.name}: ${(err as Error).message}`);
      }
    }
    if (prepared.length === 0) return;

    if (prepared.length === 1 && !inBatch && !addToCurrent) {
      setFile(prepared[0]);
      setRestoredImage(null);
      setStatus('idle');
      setActiveRestorationId(null);
      setResultOptions(null);
      return;
    }

    // Starting a batch: bring along a single uploaded photo that hasn't been
    // restored yet (album photos have a storage URL, not a data URL).
    const carry = !inBatch && file && status !== 'success' && file.previewUrl.startsWith('data:') ? [file] : [];
    const added = batch.add([...carry, ...prepared]);
    if (!selectedItem) setSelectedQueueId(added[0].id);
  }, [inBatch, file, status, batch, selectedItem, refreshQuota]);

  const handleRemoveQueueItem = (id: string) => {
    const rest = batch.items.filter(i => i.id !== id);
    batch.remove(id);
    if (rest.length === 0) {
      setSelectedQueueId(null);
      handleReset();
    } else if (id === selectedQueueId) {
      setSelectedQueueId(rest[0].id);
    }
  };

  const handleClearBatch = () => {
    batch.clear();
    setSelectedQueueId(null);
    handleReset();
  };

  // Show the selected queue item in the result pane.
  useEffect(() => {
    if (!selectedItem) return;
    setFile(selectedItem.file);
    setRestoredImage(selectedItem.image ?? null);
    setStatus(selectedItem.status === 'restoring' ? 'loading' : selectedItem.status === 'done' ? 'success' : 'idle');
    setActiveRestorationId(selectedItem.restoration?.id ?? null);
    setResultOptions(selectedItem.restoration ? toPromptOptions(selectedItem.restoration)
      : selectedItem.status === 'done' ? batchOptions.current : null);
    setError(null);
  }, [selectedItem]);

  // While a batch runs, follow the photo being restored, unless the user has
  // picked a different photo to look at.
  const restoringId = batch.items.find(i => i.status === 'restoring')?.id ?? null;
  const prevRestoringRef = useRef<string | null>(null);
  useEffect(() => {
    const prev = prevRestoringRef.current;
    prevRestoringRef.current = restoringId;
    if (!restoringId) return;
    if (selectedItem && (selectedItem.id === prev || selectedItem.status === 'queued')) setSelectedQueueId(restoringId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restoringId]);

  const handleRestoreBatch = async () => {
    const currentQuota = await refreshQuota();
    if (!currentQuota.allowed) {
      setShowZeroCreditsModal(true);
      return;
    }
    setError(null);
    const options = promptOptions; // every photo in this run gets the same style
    batchOptions.current = options;
    await batch.run(
      async (f) => {
        const { data, mimeType } = await toUploadData(f);
        return restoreImage(data, mimeType, f.name, options);
      },
      (item) => {
        if (item.restoration) archive.add(item.restoration);
        refreshQuota();
      },
    );
  };

  const handleRestore = async () => {
    if (inBatch) return handleRestoreBatch();
    try {
      const currentQuota = await refreshQuota();
      if (!currentQuota.allowed) {
        setShowZeroCreditsModal(true);
        return;
      }

      if (!file) return;

      const options = promptOptions;
      setStatus('loading');
      setError(null);
      setRestoredImage(null);
      setActiveRestorationId(null);

      const { data, mimeType } = await toUploadData(file);
      const { image, restoration } = await restoreImage(data, mimeType, file.name, options);
      await refreshQuota();
      setRestoredImage(image);
      setResultOptions(options);
      if (restoration) {
        archive.add(restoration);
        setActiveRestorationId(restoration.id);
      }
      setStatus('success');
    } catch (err) {
      setError((err as Error).message || 'The restoration failed. Try again.');
      setStatus('error');
    }
  };

  const handleLogout = async () => {
    batch.stop();
    await authService.signOut();
    onSignOut();
  };

  // Loads an album photo into the workspace with its original treatment.
  const handleSelectRestoration = (r: Restoration) => {
    if (status === 'loading' || batch.isRunning || !r.originalUrl || !r.restoredUrl) return;
    setSelectedQueueId(null); // leave the queue view (the queue itself stays)
    setFile({ previewUrl: r.originalUrl, name: r.originalName ?? 'photo', mimeType: '' });
    setRestoredImage(r.restoredUrl);
    const options = toPromptOptions(r);
    setPromptOptions(options);
    setResultOptions(options);
    setStatus('success');
    setError(null);
    setActiveRestorationId(r.id);
    onNavigate('restore');
  };

  const handleDeleteRestoration = async (id: string) => {
    await archive.remove(id);
    if (id === activeRestorationId) handleReset();
  };

  // Settings: delete every photo in the album. Anything on screen that points
  // at a deleted restoration goes too.
  const handleDeleteAll = async () => {
    await archiveService.removeAll();
    setShareTargetId(null);
    if (!batch.isRunning) {
      batch.clear();
      setSelectedQueueId(null);
    }
    if (activeRestorationId || status === 'success') handleReset();
    archive.reset();
    if (view === 'album') archive.reload();
  };

  // Leaving the page mid-restore loses the result, so ask first.
  const busy = batch.isRunning || status === 'loading';
  useEffect(() => {
    if (!busy) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [busy]);

  // Batch counts. "Pending" includes photos skipped for lack of credits, which
  // the next run retries. Failed photos aren't retried automatically.
  const pending = batch.items.filter(i => i.status === 'queued' || i.status === 'skipped').length;
  const left = batch.items.filter(i => i.status === 'queued' || i.status === 'restoring').length;
  const plural = (n: number) => `${n} photo${n === 1 ? '' : 's'}`;
  const isRestoring = inBatch ? batch.isRunning : status === 'loading';

  // What the main button does right now.
  const changed = status === 'success' && resultOptions !== null && !sameOptions(promptOptions, resultOptions);
  const button: { text: string; variant: 'primary' | 'quiet'; disabled: boolean } = inBatch
    ? batch.isRunning
      ? { text: `Restoring, ${left} to go`, variant: 'primary', disabled: true }
      : pending === 0
        ? { text: 'All done', variant: 'quiet', disabled: true }
        : !quota.allowed
          ? { text: 'No restorations left', variant: 'quiet', disabled: true }
          : { text: `Restore ${plural(pending)}`, variant: 'primary', disabled: false }
    : !quota.allowed
      ? { text: 'No restorations left', variant: 'quiet', disabled: true }
      : status === 'loading'
        ? { text: 'Restoring', variant: 'primary', disabled: true }
        : status === 'success'
          ? changed
            ? {
                text: promptOptions.process !== resultOptions!.process
                  ? `Restore in ${processLabel(promptOptions.process).toLowerCase()}`
                  : 'Restore with these extras',
                variant: 'primary', disabled: false,
              }
            : { text: 'Restore again', variant: 'quiet', disabled: false }
          : { text: 'Restore photo', variant: 'primary', disabled: !file };

  const linkCls = 'text-bone-2 underline decoration-rule decoration-[1.5px] underline-offset-4 hover:text-bone hover:decoration-bone-3';
  const pickFiles = (addToCurrent: boolean) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (files.length) handleFilesSelect(files, addToCurrent);
  };

  return (
    <div className="min-h-dvh flex flex-col">
      <SkipLink />
      <Header
        user={user}
        quota={quota}
        view={view}
        onNavigate={onNavigate}
        onLogout={handleLogout}
        onOpenSettings={() => setShowSettings(true)}
      />

      {view === 'album' ? (
        <AlbumView
          archive={archive}
          activeId={activeRestorationId}
          canSelect={status !== 'loading' && !batch.isRunning}
          onSelect={handleSelectRestoration}
          onDelete={handleDeleteRestoration}
          onShare={(r) => setShareTargetId(r.id)}
          onRestoreNew={() => onNavigate('restore')}
        />
      ) : (
        <main id="main" tabIndex={-1} className="flex-1 mx-auto w-full max-w-[1440px] px-4 sm:px-9 pt-8 pb-16 grid gap-9 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-14 lg:items-start outline-none">
          {file ? (
            <RestoredView
              title="Restore a photo"
              originalUrl={file.previewUrl}
              originalName={file.name}
              restoredUrl={restoredImage}
              status={status}
              archived={activeRestorationId !== null}
              treatment={resultOptions ? treatmentLabel(resultOptions) : null}
              onRemove={selectedItem ? () => handleRemoveQueueItem(selectedItem.id) : handleReset}
              onShare={activeRestorationId ? () => setShareTargetId(activeRestorationId) : undefined}
            />
          ) : (
            <section className="flex flex-col gap-6 min-w-0" aria-label="Your photo">
              <h1 className="font-display text-[clamp(30px,3.4vw,40px)] leading-[1.05]">Restore a photo</h1>
              <div className="py-2 sm:py-6"><Dropzone onFilesSelect={(f) => handleFilesSelect(f)} /></div>
            </section>
          )}

          <aside className="bg-panel rounded-md min-w-0 lg:sticky lg:top-6" aria-label="Restoration settings">
            {inBatch ? (
              <section className="flex flex-col gap-3.5 p-[22px] border-b border-rule">
                <h2 className="font-display text-[21px] leading-tight">Your photos</h2>
                <BatchQueuePanel
                  items={batch.items}
                  isRunning={batch.isRunning}
                  selectedId={selectedQueueId}
                  onSelect={setSelectedQueueId}
                  onRemove={handleRemoveQueueItem}
                  onAddFiles={(f) => handleFilesSelect(f, true)}
                  onClear={handleClearBatch}
                />
              </section>
            ) : file && (
              <section className="flex flex-col gap-3.5 p-[22px] border-b border-rule">
                <h2 className="font-display text-[21px] leading-tight">Your photo</h2>
                <div className="flex gap-4 items-center">
                  <span className="mount mount-xs block shrink-0 w-16">
                    <img src={file.previewUrl} alt="" className="block w-16 h-16 object-cover" />
                  </span>
                  <div className="min-w-0 flex flex-col gap-1 text-[15px]">
                    <span className="truncate text-bone">{file.name}</span>
                    {!isRestoring && (
                      <span className="flex flex-wrap gap-x-4 gap-y-1">
                        <button type="button" className={linkCls} onClick={() => replaceRef.current?.click()}>Replace</button>
                        <button type="button" className={linkCls} onClick={() => addMoreRef.current?.click()}>Add more photos</button>
                      </span>
                    )}
                  </div>
                </div>
                <input ref={replaceRef} type="file" className="hidden" accept={UPLOAD_TYPES.join(', ')} onChange={pickFiles(false)} />
                <input ref={addMoreRef} type="file" multiple className="hidden" accept={UPLOAD_TYPES.join(', ')} onChange={pickFiles(true)} />
              </section>
            )}

            <PromptSelector
              options={promptOptions}
              onChange={setPromptOptions}
              previewUrl={file?.previewUrl ?? SAMPLE_BEFORE}
              disabled={isRestoring}
            />

            <div className="flex flex-col gap-3 p-[22px]">
              <Button
                onClick={handleRestore}
                disabled={button.disabled}
                isLoading={isRestoring}
                variant={button.variant}
                className="w-full"
              >
                {button.text}
              </Button>

              {inBatch && batch.isRunning && (
                <button type="button" onClick={batch.stop} disabled={batch.stopRequested}
                  className={`self-center text-[15px] ${linkCls} disabled:opacity-60`}>
                  {batch.stopRequested ? 'Stopping after this photo' : 'Stop after this photo'}
                </button>
              )}

              {!quota.allowed ? (
                <p className="text-[15px] text-bone-3">
                  You've used all your free restorations.
                  {quota.nextReset ? <> You get 1 more in <Countdown targetDate={quota.nextReset} />.</> : null}
                </p>
              ) : inBatch ? (
                !batch.isRunning && pending > 0 && (
                  <p className="text-[15px] text-bone-3">
                    {pending > quota.remaining
                      ? `You have ${quota.remaining} left, so the first ${quota.remaining} will be restored. The rest wait for more credits (you get 1 every 24 hours).`
                      : `Uses ${pending} of your ${quota.remaining} restorations left. Every photo gets the same style.`}
                  </p>
                )
              ) : (
                file && status !== 'loading' && (
                  <p className="text-[15px] text-bone-3">Uses 1 credit. You have {quota.remaining} left.</p>
                )
              )}

              {error && <Notice tone="error">{error}</Notice>}
            </div>
          </aside>
        </main>
      )}

      <SiteFooter wide />

      {askNewPassword && <NewPasswordModal onClose={onNewPasswordDone} />}

      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        user={user}
        onUpdateUser={onUserChange}
        onDeleteAll={handleDeleteAll}
        canDeleteAll={!batch.isRunning && status !== 'loading'}
      />

      {shareTarget && (
        <ShareDialog
          restoration={shareTarget}
          onSetShared={(shared) => archive.setShared(shareTarget.id, shared)}
          onClose={() => setShareTargetId(null)}
        />
      )}

      {showZeroCreditsModal && (
        <Modal title="No restorations left" onClose={() => setShowZeroCreditsModal(false)}>
          <p className="text-bone-2 mb-5">
            You've used all your free restorations. You get 1 back every 24 hours, up to 3. Your album and downloads still work.
          </p>
          {quota.nextReset ? (
            <div className="mb-7 px-5 py-4 rounded bg-cover border border-rule">
              <p className="text-[15px] text-bone-3">The next one comes in</p>
              <Countdown targetDate={quota.nextReset} className="font-display text-3xl text-brass" />
            </div>
          ) : null}
          <Button variant="quiet" className="w-full" onClick={() => setShowZeroCreditsModal(false)}>Close</Button>
        </Modal>
      )}
    </div>
  );
};

export default Workspace;
