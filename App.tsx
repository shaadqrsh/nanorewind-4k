import React, { useState, useCallback, useEffect } from 'react';
import { Dropzone } from './components/Dropzone';
import { Header } from './components/Header';
import { RestoredView } from './components/RestoredView';
import { AuthScreen } from './components/AuthScreen';
import { PromptSelector, PromptOptions } from './components/PromptSelector';
import { restoreImage } from './services/gemini';
import { authService } from './services/auth';
import { ImageFile, RestorationStatus } from './types';
import { AlertCircle, Wand2, RefreshCw, Check, Zap, X } from 'lucide-react';
import { Button } from './components/Button';
import { Countdown } from './components/Countdown';

export const App: React.FC = () => {
  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // App State
  const [file, setFile] = useState<ImageFile | null>(null);
  const [promptOptions, setPromptOptions] = useState<PromptOptions>({
    scratches: true,
    color: true,
    denoise: true,
    faces: true,
    sharpen: false // Default off as it can be aggressive
  });
  
  const [restoredImage, setRestoredImage] = useState<string | null>(null);
  const [status, setStatus] = useState<RestorationStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  
  // Quota State
  const [quota, setQuota] = useState({ allowed: false, remaining: 0, nextReset: 0 });
  const [showZeroCreditsModal, setShowZeroCreditsModal] = useState(false);

  // Initial Auth Check
  useEffect(() => {
    const init = async () => {
      const email = await authService.getCurrentUser();
      if (email) {
        setIsAuthenticated(true);
        setUserEmail(email);
        await refreshQuota();
      }
      setIsAuthLoading(false);
    };
    init();
  }, []);

  const refreshQuota = async () => {
    const q = await authService.checkQuota();
    setQuota({ 
        allowed: q.allowed, 
        remaining: q.remaining, 
        nextReset: q.nextReset || 0 
    });
    return q;
  };

  const handleLogout = async () => {
    await authService.logout();
    setIsAuthenticated(false);
    setUserEmail(null);
    setFile(null);
    setRestoredImage(null);
  };

  const handleFileSelect = useCallback((selectedFile: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setFile({
          file: selectedFile,
          previewUrl: e.target.result as string,
        });
        setRestoredImage(null);
        setStatus('idle');
        setError(null);
      }
    };
    reader.readAsDataURL(selectedFile);
  }, []);

  const constructPrompt = (opts: PromptOptions): string => {

    const directives = [];
    
    if (opts.scratches) {
      directives.push("Physical Damage Inpainting: Erase emulsion cracks, dust spots, and deep tears. Synthesize missing texture data in damaged regions to ensure seamless continuity with the surrounding pixel structure.");
    }

    if (opts.color) {
      directives.push("Chrominance Restoration: Correct white balance by eliminating vintage color casts (sepia, magenta, yellowing). Restore spectral accuracy to skin tones and clothing prior to grading.");
    }

    if (opts.denoise) {
      directives.push("Artifact Removal: Eliminate JPEG compression artifacts, mosquito noise, and chroma noise. Apply structural denoising to flat areas while protecting edge definition.");
    }

    if (opts.faces) {
      directives.push("Biometric Refinement: Restore ocular clarity, distinct iris patterns, and eyelash definition. Sharpen lip texture and dental details to match a high-megapixel focal plane.");
    }

    if (opts.sharpen) {
      directives.push("Optical Deblurring: Correct lens softness and slight motion blur. Enhance edge acutance to achieve critical focus without introducing ringing artifacts or halos.");
    }
    
    const baseDirectives = directives.join(" ");

    const corePrompt = `Enhance the portrait while strictly preserving the subject's identity with accurate facial geometry. Do not change their expression or face shape.

Keep the exact same background from the reference image. No replacements, no changes, no new objects, no layout shifts. The environment must look identical. The image must be recreated as if it was shot on a Sony A1, using an 85mm f1.4 lens, at f1.6, ISO 100, 1/200 shutter speed, cinematic shallow depth of field, perfect facial focus, and an editorial-neutral color profile.

This Sony A1+ 85mm f1.4 setup is mandatory. The final image must clearly look like premium full-frame Sony A1 quality.

Lighting must match the exact direction, angle, and mood of the reference photo. Upgrade the lighting into a cinematic, subject-focused style: soft directional light, warm highlights, cool shadows, deeper contrast, expanded dynamic range, micro-contrast boost, smooth gradations, and zero harsh shadows. Maintain neutral premium color tone, cinematic contrast curve, natural saturation, real skin texture (not plastic), and subtle film grain. No fake glow, no runway lighting, no oversmoothing.

CRITICAL: The output image MUST have the EXACT SAME aspect ratio as the original input image. Do not crop, do not resize, do not change dimensions. Maintain the original frame.

Re-render the subject with improved realism, depth, texture, and lighting while keeping identity and background fully preserved.`;

    const negativePrompt = `NEGATIVE INSTRUCTIONS:
No cropping.
No aspect ratio change.
No new background.
No background change.
No overly dramatic lighting.
No face morphing.
No fake glow.
No flat lighting.
No over-smooth skin.`;
    
    return `${baseDirectives}\n\n${corePrompt}\n\n${negativePrompt}`;
  };

  const handleRestore = async () => {
    // Check quota one last time before action
    const currentQuota = await refreshQuota();
    if (!currentQuota.allowed) {
        setError("Daily limit reached.");
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
      const finalPrompt = constructPrompt(promptOptions);

      // Call backend
      const restoredBase64 = await restoreImage(base64Data, mimeType, finalPrompt);
      
      // Update UI state after successful restoration
      const updatedQuota = await refreshQuota();
      
      if (updatedQuota.remaining === 0) {
          setShowZeroCreditsModal(true);
      }

      setRestoredImage(restoredBase64);
      setStatus('success');
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to restore image. Please try again.");
      setStatus('error');
    }
  };

  const handleReset = () => {
    setFile(null);
    setRestoredImage(null);
    setStatus('idle');
    setError(null);
  };

  // Render Logic
  if (isAuthLoading) return null; // Or a spinner
  
  if (!isAuthenticated) {
    return <AuthScreen onAuthSuccess={async () => {
        const email = await authService.getCurrentUser();
        setUserEmail(email);
        setIsAuthenticated(true);
        await refreshQuota();
    }} />;
  }

  return (
    <div className="min-h-screen flex flex-col font-sans text-slate-100">
      <Header 
        user={userEmail} 
        quota={quota} 
        onLogout={handleLogout} 
      />
      
      <main className="flex-grow container mx-auto px-4 py-8 max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Input & Controls */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Input Section */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 shadow-xl backdrop-blur-sm">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <span className="bg-banana-500 text-slate-900 rounded-lg p-1 w-8 h-8 flex items-center justify-center text-sm font-bold">1</span>
                Upload Image
              </h2>
              
              {!file ? (
                <Dropzone onFileSelect={handleFileSelect} />
              ) : (
                <div className="relative group rounded-xl overflow-hidden border border-slate-600 bg-slate-900">
                  <img 
                    src={file.previewUrl} 
                    alt="Original" 
                    className="w-full h-auto max-h-[300px] object-contain mx-auto"
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button 
                      onClick={handleReset}
                      className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-full font-medium text-sm transition-colors"
                    >
                      Remove Image
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Prompt Selector Section */}
            <PromptSelector options={promptOptions} onChange={setPromptOptions} />

            {/* Action Section */}
            <div className="space-y-4">
                <Button
                    onClick={handleRestore}
                    disabled={!file || status === 'loading' || !quota.allowed || status === 'success'}
                    isLoading={status === 'loading'}
                    icon={status === 'success' ? Check : Wand2}
                    className={`w-full text-lg ${
                        !file || status === 'loading' || !quota.allowed || status === 'success'
                        ? 'bg-slate-700 text-slate-500 cursor-not-allowed shadow-none from-slate-700 to-slate-700'
                        : ''
                    }`}
                >
                    {status === 'loading' ? 'Restoring...' : status === 'success' ? 'Restored' : 'Restore Image'}
                </Button>
                
                {!quota.allowed && (
                    <div className="text-center text-xs text-red-400 font-medium">
                        Daily limit reached. Please try again later.
                    </div>
                )}
            </div>
            
            {error && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-200 p-4 rounded-xl flex items-start gap-3 text-sm">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <p>{error}</p>
              </div>
            )}
          </div>

          {/* Right Column: Output */}
          <div className="lg:col-span-8">
             <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 shadow-xl backdrop-blur-sm h-full min-h-[600px] flex flex-col">
                <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                  <span className="bg-banana-500 text-slate-900 rounded-lg p-1 w-8 h-8 flex items-center justify-center text-sm font-bold">3</span>
                  Result
                </h2>
                
                <div className="flex-grow flex items-center justify-center bg-slate-900/50 rounded-xl border border-slate-700/50 overflow-hidden relative">
                  {!file ? (
                    <div className="text-center p-8 text-slate-500">
                      <Wand2 className="w-16 h-16 mx-auto mb-4 opacity-20" />
                      <p>Upload an image to start the restoration process.</p>
                    </div>
                  ) : (
                    <RestoredView 
                      originalUrl={file.previewUrl}
                      restoredUrl={restoredImage}
                      status={status}
                    />
                  )}
                </div>
             </div>
          </div>

        </div>
      </main>
      
      <footer className="py-6 text-center text-slate-500 text-sm">
        
      </footer>

      {/* Zero Credits Modal */}
      {showZeroCreditsModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 max-w-md w-full shadow-2xl relative">
                <button 
                    onClick={() => setShowZeroCreditsModal(false)}
                    className="absolute top-4 right-4 text-slate-500 hover:text-white"
                >
                    <X className="w-5 h-5" />
                </button>
                
                <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 rounded-full bg-slate-700 flex items-center justify-center mb-6 border-4 border-slate-800">
                        <Zap className="w-8 h-8 text-slate-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Out of Credits</h2>
                    <p className="text-slate-400 mb-8">
                        You have used all your daily restoration credits. You will receive more credits in:
                    </p>
                    
                    <div className="bg-slate-900/50 border border-slate-700 rounded-xl px-8 py-4 mb-8">
                        <Countdown 
                            targetDate={quota.nextReset} 
                            className="text-2xl font-mono text-banana-400"
                        />
                    </div>
                    
                    <Button 
                        onClick={() => setShowZeroCreditsModal(false)}
                        variant="secondary"
                        className="w-full"
                    >
                        Close
                    </Button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};