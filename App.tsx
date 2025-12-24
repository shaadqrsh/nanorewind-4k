import React, { useState, useCallback, useEffect } from 'react';
import { Dropzone } from './components/Dropzone';
import { Header } from './components/Header';
import { RestoredView } from './components/RestoredView';
import { AuthScreen } from './components/AuthScreen';
import { PromptSelector, PromptOptions } from './components/PromptSelector';
import { restoreImage } from './services/gemini';
import { auth, authService } from './services/auth';
import { ImageFile, RestorationStatus } from './types';
import { AlertCircle, Wand2, Check, Zap, X, XCircle } from 'lucide-react';
import { Button } from './components/Button';
import { Countdown } from './components/Countdown';

export const App: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);

  const [file, setFile] = useState<ImageFile | null>(null);
  const [promptOptions, setPromptOptions] = useState<PromptOptions>({
    scratches: true,
    color: true,
    denoise: true,
    faces: true,
    sharpen: false
  });
  
  const [restoredImage, setRestoredImage] = useState<string | null>(null);
  const [status, setStatus] = useState<RestorationStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [quota, setQuota] = useState({ allowed: false, remaining: 0, nextReset: 0 });
  const [showZeroCreditsModal, setShowZeroCreditsModal] = useState(false);

  const refreshQuota = useCallback(async () => {
    const q = await authService.checkQuota();
    setQuota({ 
        allowed: q.allowed, 
        remaining: q.remaining, 
        nextReset: q.nextReset || 0 
    });
    return q;
  }, []);

  useEffect(() => {
    const checkSession = async () => {
      const session = await auth.getSession();
      const currentUser = await auth.getUser();
      setUser(currentUser);
      setIsSignedIn(!!session);
      setIsLoaded(true);
      
      if (session) {
        refreshQuota().then(q => {
          if (q && !q.allowed) setShowZeroCreditsModal(true);
        });
      }
    };
    checkSession();
    
    // Subscribe to auth changes if library supports it, or poll
    const interval = setInterval(async () => {
       const session = await auth.getSession();
       setIsSignedIn(!!session);
    }, 5000);

    return () => clearInterval(interval);
  }, [refreshQuota]);

  const handleFileSelect = useCallback((selectedFile: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setFile({ file: selectedFile, previewUrl: e.target.result as string });
        setRestoredImage(null);
        setStatus('idle');
        setError(null);
      }
    };
    reader.readAsDataURL(selectedFile);
  }, []);

  const handleRestore = async () => {
    const session = await auth.getSession();
    if (!session) return;

    const currentQuota = await refreshQuota();
    if (!currentQuota?.allowed) {
        setShowZeroCreditsModal(true);
        return;
    }

    if (!file) return;

    setStatus('loading');
    setError(null);
    setRestoredImage(null);

    try {
      const base64Data = file.previewUrl.split(',')[1];
      const mimeType = file.file.type;
      
      const directives = [];
      if (promptOptions.scratches) directives.push("Erase cracks/tears.");
      if (promptOptions.color) directives.push("Fix color balance.");
      if (promptOptions.denoise) directives.push("Remove noise.");
      if (promptOptions.faces) directives.push("Restore facial details.");
      if (promptOptions.sharpen) directives.push("Correct blur.");
      
      const finalPrompt = `${directives.join(" ")} Enhance portrait. Preserve identity. Sony A1 look. Neutral color. Same aspect ratio.`;
      
      const restoredBase64 = await restoreImage(base64Data, mimeType, finalPrompt, session.accessToken);
      await refreshQuota();
      setRestoredImage(restoredBase64);
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
  };

  const handleLogout = async () => {
    await auth.signOut();
    setIsSignedIn(false);
    setUser(null);
  };

  if (!isLoaded) return null;
  if (!isSignedIn) return <AuthScreen onAuthSuccess={() => setIsSignedIn(true)} />;

  const buttonConfig = !quota.allowed 
    ? { text: 'Limit Reached', icon: XCircle, variant: 'danger' as const, disabled: true }
    : status === 'loading' 
    ? { text: 'Restoring...', icon: Wand2, variant: 'primary' as const, disabled: true }
    : status === 'success'
    ? { text: 'Restored', icon: Check, variant: 'primary' as const, disabled: true }
    : { text: 'Restore Image', icon: Wand2, variant: 'primary' as const, disabled: !file };

  return (
    <div className="min-h-screen md:h-screen flex flex-col font-sans text-slate-100 md:overflow-hidden bg-slate-950">
      <Header user={user?.email || null} quota={quota} onLogout={handleLogout} />
      <main className="flex-grow md:overflow-hidden container mx-auto px-4 py-4 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
          <div className="lg:col-span-4 flex flex-col h-full gap-4 md:overflow-hidden">
            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4 shadow-xl backdrop-blur-sm shrink-0">
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <span className="bg-banana-500 text-slate-900 rounded-lg w-6 h-6 flex items-center justify-center text-xs font-bold">1</span>
                Upload Image
              </h2>
              {!file ? (
                <div className="h-40"><Dropzone onFileSelect={handleFileSelect} /></div>
              ) : (
                <div className="relative group rounded-xl overflow-hidden border border-slate-600 bg-slate-900 h-40">
                  <img src={file.previewUrl} alt="Original" className="w-full h-full object-contain" />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button onClick={handleReset} className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-full font-medium text-xs">Remove</button>
                  </div>
                </div>
              )}
            </div>
            <div className="flex-grow md:overflow-y-auto pr-1">
              <PromptSelector options={promptOptions} onChange={setPromptOptions} />
            </div>
            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4 shadow-xl backdrop-blur-sm shrink-0 mt-auto">
                <Button onClick={handleRestore} disabled={buttonConfig.disabled} isLoading={status === 'loading'} icon={buttonConfig.icon} variant={buttonConfig.variant} className="w-full py-3">{buttonConfig.text}</Button>
                {error && (
                  <div className="mt-3 bg-red-500/10 border border-red-500/50 text-red-200 p-2 rounded-lg flex items-center gap-2 text-xs">
                    <AlertCircle className="w-4 h-4 shrink-0" /><p className="truncate">{error}</p>
                  </div>
                )}
            </div>
          </div>
          <div className="lg:col-span-8 h-full md:overflow-hidden">
             <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4 shadow-xl backdrop-blur-sm h-full flex flex-col md:overflow-hidden">
                <h2 className="text-lg font-semibold mb-3 flex items-center gap-2 shrink-0">
                  <span className="bg-banana-500 text-slate-900 rounded-lg w-6 h-6 flex items-center justify-center text-xs font-bold">3</span>
                  Result
                </h2>
                <div className="flex-grow flex items-center justify-center bg-slate-900/50 rounded-xl border border-slate-700/50 overflow-hidden relative min-h-[400px] md:min-h-0">
                  {!file ? (
                    <div className="text-center p-8 text-slate-500"><Wand2 className="w-12 h-12 mx-auto mb-4 opacity-10" /><p className="text-sm">Ready for restoration.</p></div>
                  ) : (<RestoredView originalUrl={file.previewUrl} restoredUrl={restoredImage} status={status} />)}
                </div>
             </div>
          </div>
        </div>
      </main>
      {showZeroCreditsModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 max-w-md w-full shadow-2xl relative">
                <button onClick={() => setShowZeroCreditsModal(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white"><X className="w-5 h-5" /></button>
                <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 rounded-full bg-slate-700 flex items-center justify-center mb-6 border-4 border-slate-800"><Zap className="w-8 h-8 text-slate-500" /></div>
                    <h2 className="text-2xl font-bold text-white mb-2">Out of Credits</h2>
                    <p className="text-slate-400 mb-6">Daily restoration credits exhausted. Next refill in:</p>
                    <div className="bg-slate-900/50 border border-slate-700 rounded-xl px-8 py-4 mb-8">
                        <Countdown targetDate={quota.nextReset} className="text-2xl font-mono text-banana-400" />
                    </div>
                    <Button onClick={() => setShowZeroCreditsModal(false)} variant="secondary" className="w-full">Close</Button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};