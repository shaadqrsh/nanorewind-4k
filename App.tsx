import React, { useState, useCallback, useEffect } from 'react';
import { Dropzone } from './components/Dropzone';
import { Header } from './components/Header';
import { RestoredView } from './components/RestoredView';
import { AuthScreen } from './components/AuthScreen';
import { LandingPage } from './components/LandingPage';
import { PromptSelector, PromptOptions, toPromptOptions } from './components/PromptSelector';
import { SettingsModal } from './components/SettingsModal';
import { ArchiveView } from './components/ArchiveView';
import { restoreImage } from './services/gemini';
import { authService } from './services/auth';
import { useArchive } from './hooks/useArchive';
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
        authService.handleEmailRedirect();
        const session = await authService.getSession();

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
  }, [refreshQuota]);

  const handleFileSelect = useCallback((selectedFile: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setFile({
          previewUrl: e.target.result as string,
          name: selectedFile.name,
          mimeType: selectedFile.type,
        });
        setRestoredImage(null);
        setStatus('idle');
        setError(null);
        setActiveRestorationId(null);
      }
    };
    reader.readAsDataURL(selectedFile);
  }, []);

  const handleRestore = async () => {
    try {
      const token = authService.getToken();
      if (!token) return;

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

      const { image, restoration } = await restoreImage(base64Data, file.mimeType, file.name, promptOptions, token);
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

  const handleLogout = async () => {
    await authService.signOut();
    setIsSignedIn(false);
    setUser(null);
    setFile(null);
    setRestoredImage(null);
    setStatus('idle');
    setActiveRestorationId(null);
    setShowArchive(false);
    archive.reset();
    goTo('landing', true);
  };

  const handleOpenArchive = () => {
    setShowArchive(true);
    archive.ensureFresh();
  };

  // Loads an archived plate into the workspace with its original treatment.
  const handleSelectRestoration = (r: Restoration) => {
    if (status === 'loading' || !r.originalUrl || !r.restoredUrl) return;
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
        onAuthSuccess={handleAuthSuccess}
        onBack={() => goTo('landing')}
      />
    );
  }

  const buttonConfig = !quota.allowed
    ? { text: 'No credits left', icon: XCircle, variant: 'danger' as const, disabled: true }
    : status === 'loading'
      ? { text: 'Restoring…', icon: Wand2, variant: 'primary' as const, disabled: true }
      : status === 'success'
        ? { text: 'Done', icon: Check, variant: 'primary' as const, disabled: true }
        : { text: 'Restore photo', icon: Wand2, variant: 'primary' as const, disabled: !file };

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
                <h2 className="font-display text-base font-semibold text-ink-100">Upload a photo</h2>
              </header>
              <div className="p-3">
                {!file ? (
                  <div className="h-40"><Dropzone onFileSelect={handleFileSelect} /></div>
                ) : (
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
                isLoading={status === 'loading'}
                icon={buttonConfig.icon}
                variant={buttonConfig.variant}
                className="w-full"
              >
                {buttonConfig.text}
              </Button>
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
                      Not saved · download to keep
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
                    onRemove={handleReset}
                  />
                )}
              </div>
            </section>
          </div>
        </div>
      </main>

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
        canSelect={status !== 'loading'}
        onSelect={handleSelectRestoration}
        onDelete={handleDeleteRestoration}
      />

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
