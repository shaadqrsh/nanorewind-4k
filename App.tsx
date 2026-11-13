import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Dropzone } from './components/Dropzone';
import { BatchQueuePanel } from './components/BatchQueuePanel';
import { useBatchQueue } from './hooks/useBatchQueue';
import { prepareUpload, UPLOAD_TYPES } from './utils/image';
import { Header } from './components/Header';
import { RestoredView } from './components/RestoredView';
import { AuthScreen } from './components/AuthScreen';
import { LandingPage } from './components/LandingPage';
import { NewPasswordModal } from './components/NewPasswordModal';
import { ShareDialog } from './components/ShareDialog';
import { PromptSelector, PromptOptions, toPromptOptions } from './components/PromptSelector';
import { SettingsModal } from './components/SettingsModal';
import { ArchiveView } from './components/ArchiveView';
import { restoreImage } from './services/gemini';
import { authService } from './services/auth';
import { useArchive } from './hooks/useArchive';
import { SESSION_EXPIRED_EVENT } from './services/http';
import { ImageFile, Restoration, RestorationStatus, User } from './types';
import { AlertCircle, Wand2, Check, X, XCircle, Loader2, History } from 'lucide-react';
import { Button } from './components/Button';
import { Countdown } from './components/Countdown';

// Signed-out screens live in the URL hash (#signin / #signup) so Back and
// reloads work without needing SPA rewrites for real paths.
type PublicView = 'landing' | 'signin' | 'signup';

const viewFromHash = (): PublicView =>
  window.location.hash === '#signin' ? 'signin'
    : window.location.hash === '#signup' ? 'signup'
      : 'landing';

export const App: React.FC = () => {
  const [publicView, setPublicView] = useState<PublicView>(viewFromHash);

  useEffect(() => {
    const sync = () => setPublicView(viewFromHash());
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
    window.scrollTo(0, 0);
  }, []);

  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);

  const [showSettings, setShowSettings] = useState(false);
  // Set by a password-reset link; asks the user to choose the new password.
  const [showNewPassword, setShowNewPassword] = useState(false);
  // Why an email link didn't sign the user in; shown on the sign-in screen.
  const [authNotice, setAuthNotice] = useState<string | null>(null);

  const [file, setFile] = useState<ImageFile | null>(null);
  const [promptOptions, setPromptOptions] = useState<PromptOptions>({
    process: 'standard',
    chiaroscuro: false,
    matte: false
  });

  const [restoredImage, setRestoredImage] = useState<string | null>(null);
  const [status, setStatus] = useState<RestorationStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [quota, setQuota] = useState({ allowed: false, remaining: 0, nextReset: 0 });
  const [showZeroCreditsModal, setShowZeroCreditsModal] = useState(false);

  const archive = useArchive();
  const [showArchive, setShowArchive] = useState(false);
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
    document.documentElement.classList.add('dark');
  }, [refreshQuota, goTo]);

  // One photo: the single-photo flow. Several (or adding to an existing batch):
  // the queue. Large photos are shrunk to fit the upload limit first.
  const handleFilesSelect = useCallback(async (files: File[]) => {
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

    if (prepared.length === 1 && !inBatch) {
      setFile(prepared[0]);
      setRestoredImage(null);
      setStatus('idle');
      setActiveRestorationId(null);
      return;
    }

    // Starting a batch: bring along a single uploaded photo that hasn't been
    // restored yet (archived photos have a storage URL, not a data URL).
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
    await batch.run(
      (f) => restoreImage(f.previewUrl.split(',')[1], f.mimeType, f.name, options),
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

      setStatus('loading');
      setError(null);
      setRestoredImage(null);
      setActiveRestorationId(null);

      const base64Data = file.previewUrl.split(',')[1];

      const { image, restoration } = await restoreImage(base64Data, file.mimeType, file.name, promptOptions);
      await refreshQuota();
      setRestoredImage(image);
      if (restoration) {
        archive.add(restoration);
        setActiveRestorationId(restoration.id);
      }
      setStatus('success');
    } catch (err: any) {
      setError(err.message || "Restoration failed.");
      setStatus('error');
    }
  };

  const handleReset = () => {
    setFile(null);
    setRestoredImage(null);
    setStatus('idle');
    setError(null);
    setActiveRestorationId(null);
  };

  // Drops all signed-in state and returns to the home page.
  const clearSignedInState = useCallback(() => {
    setIsSignedIn(false);
    setUser(null);
    setFile(null);
    setRestoredImage(null);
    setStatus('idle');
    setActiveRestorationId(null);
    setShowArchive(false);
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

  const handleOpenArchive = () => {
    setShowArchive(true);
    archive.ensureFresh();
  };

  // Loads an archived plate into the workspace with its original treatment.
  const handleSelectRestoration = (r: Restoration) => {
    if (status === 'loading' || batch.isRunning || !r.originalUrl || !r.restoredUrl) return;
    setSelectedQueueId(null); // leave the queue view (the queue itself stays)
    setFile({ previewUrl: r.originalUrl, name: r.originalName ?? 'photo', mimeType: '' });
    setRestoredImage(r.restoredUrl);
    setPromptOptions(toPromptOptions(r));
    setStatus('success');
    setError(null);
    setActiveRestorationId(r.id);
    setShowArchive(false);
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

  if (configError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-ink-900 border border-ink-700 p-6 flex items-center gap-3 max-w-md shadow-plate">
          <AlertCircle className="text-rust-400 w-6 h-6 shrink-0" />
          <p className="text-ink-300 text-sm">{configError}</p>
        </div>
      </div>
    );
  }

  if (!isAuthReady || (isSignedIn && !isDataLoaded)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-5">
        <div className="relative grid place-items-center w-16 h-16">
          <div className="absolute inset-0 border border-ink-700" />
          <div className="absolute inset-0 border-t border-amber-500 animate-spin" />
          <History className="w-6 h-6 text-amber-500" strokeWidth={2} />
        </div>
        <p className="font-mono text-[10px] uppercase tracking-widest text-ink-500 animate-pulse">
          Loading…
        </p>
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

  const buttonConfig = inBatch
    ? batch.isRunning
      ? { text: `Restoring… ${left} left`, icon: Wand2, variant: 'primary' as const, disabled: true }
      : pending === 0
        ? { text: 'All done', icon: Check, variant: 'primary' as const, disabled: true }
        : !quota.allowed
          ? { text: 'No credits left', icon: XCircle, variant: 'danger' as const, disabled: true }
          : { text: `Restore ${plural(pending)}`, icon: Wand2, variant: 'primary' as const, disabled: false }
    : !quota.allowed
      ? { text: 'No credits left', icon: XCircle, variant: 'danger' as const, disabled: true }
      : status === 'loading'
        ? { text: 'Restoring…', icon: Wand2, variant: 'primary' as const, disabled: true }
        : status === 'success'
          ? { text: 'Done', icon: Check, variant: 'primary' as const, disabled: true }
          : { text: 'Restore photo', icon: Wand2, variant: 'primary' as const, disabled: !file };
  const isRestoring = inBatch ? batch.isRunning : status === 'loading';

  return (
    <div className="min-h-screen md:h-screen flex flex-col font-sans text-ink-200 md:overflow-hidden">
      <Header
        user={user}
        quota={quota}
        onLogout={handleLogout}
        onOpenSettings={() => setShowSettings(true)}
        onOpenArchive={handleOpenArchive}
      />

      <main className="flex-grow md:overflow-hidden container mx-auto max-w-7xl px-5 py-5">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-full">

          {/* Left rail - controls */}
          <div className="lg:col-span-4 flex flex-col h-full gap-5 md:overflow-hidden animate-rise">

            {/* 01 - Plate */}
            <section className="relative bg-ink-900/60 border border-ink-800 shadow-plate shrink-0">
              <div className="absolute inset-0 hairline pointer-events-none" />
              <header className="flex items-center gap-3 px-4 py-3.5 border-b border-ink-800">
                <span className="font-mono text-[11px] text-amber-500/80">1</span>
                <h2 className="font-display text-base font-semibold text-ink-100">{inBatch ? 'Upload photos' : 'Upload a photo'}</h2>
              </header>
              <div className="p-3">
                {inBatch ? (
                  <BatchQueuePanel
                    items={batch.items}
                    isRunning={batch.isRunning}
                    selectedId={selectedQueueId}
                    onSelect={setSelectedQueueId}
                    onRemove={handleRemoveQueueItem}
                    onAddFiles={handleFilesSelect}
                    onClear={handleClearBatch}
                  />
                ) : !file ? (
                  <div className="h-40"><Dropzone onFilesSelect={handleFilesSelect} /></div>
                ) : (
                  <>
                  <div className="relative group h-40 bg-ink-950 overflow-hidden border border-ink-700">
                    <img src={file.previewUrl} alt="Your uploaded photo" className="w-full h-full object-contain" />
                    {status !== 'loading' && (
                      <button
                        onClick={handleReset}
                        title="Remove photo"
                        className="absolute top-2 right-2 grid place-items-center w-7 h-7 bg-ink-950/80 border border-ink-600 text-ink-300 hover:text-rust-400 hover:border-rust-500/50 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                    <span className="absolute bottom-1.5 left-1.5 font-mono text-[9px] text-ink-300 bg-ink-950/70 px-1.5 py-0.5">
                      Original
                    </span>
                  </div>
                  {status !== 'loading' && (
                    <>
                      <button onClick={() => addMoreRef.current?.click()}
                        className="mt-2 font-mono text-[10px] uppercase tracking-widest text-ink-400 hover:text-amber-400 transition-colors">
                        + Add more photos
                      </button>
                      <input ref={addMoreRef} type="file" multiple className="hidden" accept={UPLOAD_TYPES.join(', ')}
                        onChange={(e) => {
                          const files = Array.from(e.target.files ?? []);
                          e.target.value = '';
                          if (files.length) handleFilesSelect(files);
                        }} />
                    </>
                  )}
                  </>
                )}
              </div>
            </section>

            {/* 02 - Treatment ledger */}
            <div className="flex-grow md:overflow-y-auto pr-1 -mr-1">
              <PromptSelector options={promptOptions} onChange={setPromptOptions} />
            </div>

            {/* Develop action */}
            <section className="relative bg-ink-900/60 border border-ink-800 shadow-plate shrink-0 mt-auto p-4">
              <div className="absolute inset-0 hairline pointer-events-none" />
              <Button
                onClick={handleRestore}
                disabled={buttonConfig.disabled}
                isLoading={isRestoring}
                icon={buttonConfig.icon}
                variant={buttonConfig.variant}
                className="w-full"
              >
                {buttonConfig.text}
              </Button>
              {inBatch && batch.isRunning && (
                <button onClick={batch.stop} disabled={batch.stopRequested}
                  className="mt-3 w-full font-mono text-[10px] uppercase tracking-widest text-ink-400 hover:text-amber-400 disabled:opacity-60 transition-colors">
                  {batch.stopRequested ? 'Stopping after this photo…' : 'Stop after this photo'}
                </button>
              )}
              {inBatch && !batch.isRunning && pending > 0 && quota.allowed && pending > quota.remaining && (
                <p className="mt-3 text-xs text-ink-400 leading-relaxed">
                  You have {quota.remaining} credit{quota.remaining === 1 ? '' : 's'} left today, so the first {quota.remaining} will
                  be restored. The rest wait until your credits refill.
                </p>
              )}
              {error && (
                <div className="mt-3 flex items-center gap-2 bg-rust-500/10 border border-rust-500/30 text-rust-400 px-3 py-2 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <p className="truncate">{error}</p>
                </div>
              )}
            </section>
          </div>

          {/* Right - the development bath */}
          <div className="lg:col-span-8 h-full md:overflow-hidden animate-rise" style={{ animationDelay: '90ms' }}>
            <section className="relative bg-ink-900/60 border border-ink-800 shadow-plate h-full flex flex-col md:overflow-hidden">
              <div className="absolute inset-0 hairline pointer-events-none" />
              <header className="flex items-center justify-between px-4 py-3.5 border-b border-ink-800 shrink-0">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[11px] text-amber-500/80">3</span>
                  <h2 className="font-display text-base font-semibold text-ink-100">Result</h2>
                </div>
                {status === 'success' && restoredImage ? (
                  activeRestorationId ? (
                    <span className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-widest text-patina-400">
                      <Check className="w-3 h-3" /> Saved to archive
                    </span>
                  ) : (
                    <span className="font-mono text-[9px] uppercase tracking-widest text-rust-400" title="This result couldn't be saved to your archive">
                      Not saved, download to keep
                    </span>
                  )
                ) : (
                  <span className="font-mono text-[9px] uppercase tracking-widest text-ink-600 hidden sm:block">
                    before / after
                  </span>
                )}
              </header>

              <div className="flex-grow flex items-center justify-center bg-ink-950/60 overflow-hidden relative min-h-[400px] md:min-h-0">
                {!file ? (
                  <div className="text-center p-8">
                    <div className="relative inline-grid place-items-center w-14 h-14 mb-5 border border-ink-700">
                      <Wand2 className="w-6 h-6 text-ink-600" strokeWidth={1.5} />
                      <span className="absolute -top-px -left-px w-2 h-2 border-t border-l border-amber-500/40" />
                      <span className="absolute -bottom-px -right-px w-2 h-2 border-b border-r border-amber-500/40" />
                    </div>
                    <p className="font-display text-lg text-ink-300">No photo yet</p>
                    <p className="font-mono text-[10px] uppercase tracking-widest text-ink-600 mt-1.5">
                      upload a photo to start
                    </p>
                  </div>
                ) : (
                  <RestoredView
                    originalUrl={file.previewUrl}
                    originalName={file.name}
                    restoredUrl={restoredImage}
                    status={status}
                    archived={activeRestorationId !== null}
                    onRemove={selectedItem ? () => handleRemoveQueueItem(selectedItem.id) : handleReset}
                    onShare={activeRestorationId ? () => setShareTargetId(activeRestorationId) : undefined}
                  />
                )}
              </div>
            </section>
          </div>
        </div>
      </main>

      {showNewPassword && <NewPasswordModal onClose={() => setShowNewPassword(false)} />}

      {user && (
        <SettingsModal
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          user={user}
          onUpdateUser={(updates) => setUser(prev => prev ? { ...prev, ...updates } : null)}
        />
      )}

      <ArchiveView
        isOpen={showArchive}
        onClose={() => setShowArchive(false)}
        archive={archive}
        activeId={activeRestorationId}
        canSelect={status !== 'loading' && !batch.isRunning}
        onSelect={handleSelectRestoration}
        onDelete={handleDeleteRestoration}
        onShare={(r) => setShareTargetId(r.id)}
      />

      {shareTarget && (
        <ShareDialog
          restoration={shareTarget}
          onSetShared={(shared) => archive.setShared(shareTarget.id, shared)}
          onClose={() => setShareTargetId(null)}
        />
      )}

      {showZeroCreditsModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-ink-950/85 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md bg-ink-900 border border-ink-700 shadow-plate p-8 animate-rise">
            <div className="absolute inset-0 hairline pointer-events-none" />
            <button
              onClick={() => setShowZeroCreditsModal(false)}
              className="absolute top-4 right-4 text-ink-500 hover:text-ink-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex flex-col items-center text-center">
              <div className="relative grid place-items-center w-14 h-14 mb-6 border border-ink-700 bg-ink-950">
                <span className="font-mono text-[10px] uppercase tracking-widest text-ink-500">0/3</span>
              </div>
              <h2 className="font-display text-2xl font-semibold text-ink-100 mb-2">Out of credits</h2>
              <p className="text-ink-400 text-sm mb-6 leading-relaxed">
                You've used all 3 free restorations for today. More credits in:
              </p>
              <div className="bg-ink-950 border border-ink-700 px-8 py-4 mb-8">
                <Countdown targetDate={quota.nextReset} className="text-2xl text-amber-400" />
              </div>
              <Button onClick={() => setShowZeroCreditsModal(false)} variant="secondary" className="w-full">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
