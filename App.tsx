import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Dropzone } from './components/Dropzone';
import { BatchQueuePanel } from './components/BatchQueuePanel';
import { useBatchQueue } from './hooks/useBatchQueue';
import { prepareUpload, toUploadData, UPLOAD_TYPES } from './utils/image';
import { Header, AppView } from './components/Header';
import { RestoredView } from './components/RestoredView';
import { AuthScreen } from './components/AuthScreen';
import { LandingPage } from './components/LandingPage';
import { NewPasswordModal } from './components/NewPasswordModal';
import { ShareDialog } from './components/ShareDialog';
import { PromptSelector, PromptOptions, toPromptOptions, sameOptions, processLabel, treatmentLabel } from './components/PromptSelector';
import { SettingsModal } from './components/SettingsModal';
import { AlbumView } from './components/AlbumView';
import { Modal, Notice } from './components/Modal';
import { Wordmark } from './components/Wordmark';
import { SAMPLE_BEFORE } from './components/PhotoSpread';
import { restoreImage } from './services/gemini';
import { authService } from './services/auth';
import { useArchive } from './hooks/useArchive';
import { SESSION_EXPIRED_EVENT } from './services/http';
import { ImageFile, Restoration, RestorationStatus, User } from './types';
import { Button } from './components/Button';
import { Countdown } from './components/Countdown';

// Screens live in the URL hash so Back and reloads work without SPA rewrites
// for real paths: #signin / #signup when signed out, #album when signed in.
type PublicView = 'landing' | 'signin' | 'signup';

const viewFromHash = (): PublicView =>
  window.location.hash === '#signin' ? 'signin'
    : window.location.hash === '#signup' ? 'signup'
      : 'landing';

const appViewFromHash = (): AppView => (window.location.hash === '#album' ? 'album' : 'restore');

const DEFAULT_OPTIONS: PromptOptions = { process: 'standard', chiaroscuro: false, matte: false };

export const App: React.FC = () => {
  const [publicView, setPublicView] = useState<PublicView>(viewFromHash);
  const [appView, setAppView] = useState<AppView>(appViewFromHash);

  useEffect(() => {
    const sync = () => {
      setPublicView(viewFromHash());
      setAppView(appViewFromHash());
    };
    window.addEventListener('hashchange', sync);
    window.addEventListener('popstate', sync);
    return () => {
      window.removeEventListener('hashchange', sync);
      window.removeEventListener('popstate', sync);
    };
  }, []);

  const goTo = useCallback((view: PublicView, replace = false) => {
    const url = view === 'landing' ? window.location.pathname + window.location.search : `#${view}`;
    if (replace) window.history.replaceState(null, '', url);
    else window.history.pushState(null, '', url);
    setPublicView(view);
    setAppView('restore');
    window.scrollTo(0, 0);
  }, []);

  const navigate = useCallback((view: AppView) => {
    if (view !== appViewFromHash()) {
      window.history.pushState(null, '', view === 'album' ? '#album' : window.location.pathname + window.location.search);
    }
    setAppView(view);
    window.scrollTo(0, 0);
  }, []);

  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);

  const [showSettings, setShowSettings] = useState(false);
  // Set by a password-reset link; asks the user to choose the new password.
  const [showNewPassword, setShowNewPassword] = useState(false);
  // Why an email link didn't sign the user in; shown on the sign-in screen.
  const [authNotice, setAuthNotice] = useState<string | null>(null);

  const [file, setFile] = useState<ImageFile | null>(null);
  const [promptOptions, setPromptOptions] = useState<PromptOptions>(DEFAULT_OPTIONS);
  // The treatment the result on screen was made with (null when unknown).
  const [resultOptions, setResultOptions] = useState<PromptOptions | null>(null);

  const [restoredImage, setRestoredImage] = useState<string | null>(null);
  const [status, setStatus] = useState<RestorationStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [quota, setQuota] = useState({ allowed: false, remaining: 0, nextReset: 0 });
  const [showZeroCreditsModal, setShowZeroCreditsModal] = useState(false);

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

  const refreshQuota = useCallback(async () => {
    const q = await authService.checkQuota();
    setQuota({
      allowed: q.allowed,
      remaining: q.remaining,
      nextReset: q.nextReset || 0
    });
    return q;
  }, []);

  // Initialize Auth & Config
  useEffect(() => {
    const init = async () => {
      try {
        const link = await authService.handleEmailRedirect();
        const session = await authService.getSession();

        if (link.error && !session) {
          setAuthNotice(link.error);
          goTo('signin', true);
        }
        if (link.purpose === 'recovery' && session) setShowNewPassword(true);

        if (session && session.user) {
          setUser({
            email: session.user.email || 'user@example.com',
            name: session.user.user_metadata?.name || undefined,
            id: session.user.id
          });
          setIsSignedIn(true);
          await refreshQuota().then(q => {
            if (q && !q.allowed) setShowZeroCreditsModal(true);
          });
        } else {
          setIsSignedIn(false);
          setUser(null);
        }

        setIsAuthReady(true);
        setIsDataLoaded(true);
      } catch (err) {
        console.error("Auth init failed", err);
        setIsAuthReady(true);
        setIsDataLoaded(true);
      }
    };
    init();
  }, [refreshQuota, goTo]);

  // Load the album when it's opened (by the tab, a link or the Back button).
  useEffect(() => {
    if (isSignedIn && appView === 'album') archive.ensureFresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn, appView]);

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
    if (!currentQuota?.allowed) {
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
      if (!currentQuota?.allowed) {
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

  // Drops all signed-in state and returns to the home page.
  const clearSignedInState = useCallback(() => {
    setIsSignedIn(false);
    setUser(null);
    setFile(null);
    setRestoredImage(null);
    setStatus('idle');
    setActiveRestorationId(null);
    setResultOptions(null);
    setShowSettings(false);
    setShareTargetId(null);
    batch.stop();
    batch.clear();
    setSelectedQueueId(null);
    archive.reset();
    goTo('landing', true);
  }, [archive.reset, batch.stop, batch.clear, goTo]);

  const handleLogout = async () => {
    await authService.signOut();
    clearSignedInState();
  };

  // The session can end while the app is open (revoked, or signed out on
  // another device). API calls then return 401; go back to the home page
  // instead of leaving the user in a workspace where nothing works.
  useEffect(() => {
    window.addEventListener(SESSION_EXPIRED_EVENT, clearSignedInState);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, clearSignedInState);
  }, [clearSignedInState]);

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
    navigate('restore');
  };

  const handleDeleteRestoration = async (id: string) => {
    await archive.remove(id);
    if (id === activeRestorationId) handleReset();
  };

  const handleAuthSuccess = async () => {
    setIsDataLoaded(false);
    const session = await authService.getSession();
    if (session && session.user) {
      setUser({
        email: session.user.email || 'user@example.com',
        name: session.user.user_metadata?.name || undefined,
        id: session.user.id
      });
      setIsSignedIn(true);
      await refreshQuota();
      // Drop #signin/#signup so a later sign-out lands on the home page.
      goTo('landing', true);
    }
    setIsDataLoaded(true);
  };

  if (!isAuthReady || (isSignedIn && !isDataLoaded)) {
    return (
      <div className="min-h-dvh grid place-items-center p-6" role="status" aria-label="Loading">
        <div className="flex flex-col items-center gap-6">
          <Wordmark className="text-3xl" />
          <span className="block w-40 h-0.5 overflow-hidden rounded-full bg-rule" aria-hidden="true">
            <span className="block h-full w-1/3 bg-brass animate-progress" />
          </span>
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    if (publicView === 'landing') {
      return <LandingPage onSignIn={() => goTo('signin')} onSignUp={() => goTo('signup')} />;
    }
    return (
      <AuthScreen
        key={publicView}
        initialView={publicView === 'signup' ? 'signup' : 'login'}
        notice={authNotice}
        onAuthSuccess={handleAuthSuccess}
        onBack={() => { setAuthNotice(null); goTo('landing'); }}
      />
    );
  }

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
          ? { text: 'No restorations left today', variant: 'quiet', disabled: true }
          : { text: `Restore ${plural(pending)}`, variant: 'primary', disabled: false }
    : !quota.allowed
      ? { text: 'No restorations left today', variant: 'quiet', disabled: true }
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
      <Header
        user={user!}
        quota={quota}
        view={appView}
        onNavigate={navigate}
        onLogout={handleLogout}
        onOpenSettings={() => setShowSettings(true)}
      />

      {appView === 'album' ? (
        <AlbumView
          archive={archive}
          activeId={activeRestorationId}
          canSelect={status !== 'loading' && !batch.isRunning}
          onSelect={handleSelectRestoration}
          onDelete={handleDeleteRestoration}
          onShare={(r) => setShareTargetId(r.id)}
          onRestoreNew={() => navigate('restore')}
        />
      ) : (
        <main className="flex-1 mx-auto w-full max-w-[1440px] px-4 sm:px-9 pt-8 pb-16 grid gap-9 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-14 lg:items-start">
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
                  You've used today's 3 free restorations.
                  {quota.nextReset ? <> They refill in <Countdown targetDate={quota.nextReset} />.</> : null}
                </p>
              ) : inBatch ? (
                !batch.isRunning && pending > 0 && (
                  <p className="text-[15px] text-bone-3">
                    {pending > quota.remaining
                      ? `You have ${quota.remaining} left today, so the first ${quota.remaining} will be restored. The rest wait until your credits refill.`
                      : `Uses ${pending} of your ${quota.remaining} restorations left today. Every photo gets the same style.`}
                  </p>
                )
              ) : (
                file && status !== 'loading' && (
                  <p className="text-[15px] text-bone-3">Uses 1 credit. You have {quota.remaining} left today.</p>
                )
              )}

              {error && <Notice tone="error">{error}</Notice>}
            </div>
          </aside>
        </main>
      )}

      {showNewPassword && <NewPasswordModal onClose={() => setShowNewPassword(false)} />}

      {user && (
        <SettingsModal
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          user={user}
          onUpdateUser={(updates) => setUser(prev => prev ? { ...prev, ...updates } : null)}
        />
      )}

      {shareTarget && (
        <ShareDialog
          restoration={shareTarget}
          onSetShared={(shared) => archive.setShared(shareTarget.id, shared)}
          onClose={() => setShareTargetId(null)}
        />
      )}

      {showZeroCreditsModal && (
        <Modal title="No restorations left today" onClose={() => setShowZeroCreditsModal(false)}>
          <p className="text-bone-2 mb-5">You've used all 3 free restorations for today. Your album and downloads still work.</p>
          {quota.nextReset ? (
            <div className="mb-7 px-5 py-4 rounded bg-cover border border-rule">
              <p className="text-[15px] text-bone-3">They refill in</p>
              <Countdown targetDate={quota.nextReset} className="font-display text-3xl text-brass" />
            </div>
          ) : null}
          <Button variant="quiet" className="w-full" onClick={() => setShowZeroCreditsModal(false)}>Close</Button>
        </Modal>
      )}
    </div>
  );
};
