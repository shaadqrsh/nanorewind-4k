import React, { useState } from 'react';
import { History, ArrowRight, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { authService } from '../services/auth';
import { Button } from './Button';
import { BeforeAfterShowcase } from './BeforeAfterShowcase';

interface AuthScreenProps {
  onAuthSuccess: () => void;
}

type AuthState = 'login' | 'signup';

export const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthSuccess }) => {
  const [view, setView] = useState<AuthState>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [showForgotModal, setShowForgotModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setError(null);
    setSuccessMsg(null);
    setIsLoading(true);

    try {
      if (view === 'login') {
        const data = await authService.signIn({ email, password });
        if (data.session) onAuthSuccess();
      } else {
        const data = await authService.signUp({ email, password, name });
        if (data.session) {
          onAuthSuccess();
        } else if (data.user) {
          setSuccessMsg("Account created. If verification is enabled, check your inbox.");
          setView('login');
          setIsLoading(false);
        }
      }
    } catch (err: any) {
      setError(err.message || "Authentication failed");
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setIsLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      await authService.resetPassword(resetEmail);
      setSuccessMsg("Password reset email sent. Check your inbox.");
      setShowForgotModal(false);
      setResetEmail('');
    } catch (err: any) {
      setError(err.message || "Failed to send reset email");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleView = () => {
    setError(null);
    setSuccessMsg(null);
    setShowPassword(false);
    setView(view === 'login' ? 'signup' : 'login');
  };

  const inputCls =
    "w-full bg-ink-950/70 border border-ink-700 px-4 py-3 text-sm text-ink-100 " +
    "placeholder:text-ink-600 outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/30 transition-colors";
  const labelCls = "block font-mono text-[10px] uppercase tracking-widest text-ink-500 mb-2";

  if (showForgotModal) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="relative w-full max-w-md bg-ink-900 border border-ink-700 shadow-plate p-8 animate-rise">
          <div className="absolute inset-0 hairline pointer-events-none" />
          <h2 className="font-display text-2xl font-semibold text-ink-100 mb-2 text-center">Recover access</h2>
          <p className="text-ink-400 text-center mb-6 text-sm leading-relaxed">
            Enter your email and we'll send a link to reset your password.
          </p>
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className={labelCls}>Email</label>
              <input type="email" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} className={inputCls} placeholder="you@example.com" required />
            </div>
            {error && <div className="text-rust-400 text-xs bg-rust-500/10 border border-rust-500/30 px-3 py-2">{error}</div>}
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => setShowForgotModal(false)} disabled={isLoading}
                className="flex-1 py-3 font-mono text-[12px] uppercase tracking-widest border border-ink-700 text-ink-300 hover:bg-ink-800 transition-colors">
                Cancel
              </button>
              <Button type="submit" className="flex-1" isLoading={isLoading} disabled={isLoading}>Send email</Button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen lg:h-screen lg:overflow-hidden grid lg:grid-cols-2">

      {/* Left - editorial atmosphere panel */}
      <aside className="relative hidden lg:flex flex-col justify-between p-12 overflow-hidden border-r border-ink-800">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/[0.07] via-transparent to-patina-500/[0.04]" />
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-amber-500/10 blur-[120px] animate-safelight-pulse" />

        <div className="relative flex items-center gap-3">
          <div className="grid place-items-center w-10 h-10 bg-ink-900 border border-ink-700 shadow-safelight">
            <History className="w-5 h-5 text-amber-500" strokeWidth={2} />
          </div>
          <span className="font-mono text-[10px] uppercase tracking-widest text-ink-400">NanoRewind</span>
        </div>

        <div className="relative">
          <p className="font-mono text-[10px] uppercase tracking-widest text-amber-500/70 mb-5">AI photo restoration · 4K</p>
          <h2 className="font-display text-4xl xl:text-5xl font-light leading-[1.05] text-ink-100 text-balance">
            Bring faded<br />
            <span className="italic font-normal text-amber-400">photographs</span> back to life.
          </h2>
          <p className="mt-5 max-w-sm text-ink-400 leading-relaxed text-[15px]">
            Upload an old photo and get a clean, sharp 4K version in seconds. Removes scratches,
            fixes color, and brings back detail. Powered by Gemini.
          </p>

          {/* Live showcase — auto-sweeping before/after */}
          <BeforeAfterShowcase
            beforeSrc="/showcase/before.png"
            afterSrc="/showcase/after.png"
            className="mt-8 max-w-md animate-rise"
          />
        </div>

        <div className="relative flex items-center gap-6 font-mono text-[10px] uppercase tracking-widest text-ink-600">
          <span>3 free / day</span>
          <span className="w-1 h-1 rounded-full bg-ink-700" />
          <span>secure &amp; private</span>
        </div>
      </aside>

      {/* Right - credentials */}
      <div className="relative flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm animate-rise">
          {/* Mobile mark */}
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="grid place-items-center w-11 h-11 bg-ink-900 border border-ink-700 shadow-safelight">
              <History className="w-5 h-5 text-amber-500" strokeWidth={2} />
            </div>
            <span className="font-display text-xl font-semibold text-ink-100">NanoRewind</span>
          </div>

          <h1 className="font-display text-3xl font-semibold text-ink-100 mb-1.5">
            {view === 'login' ? 'Sign in' : 'Create an account'}
          </h1>
          <p className="text-ink-500 text-sm mb-8">
            {view === 'login' ? 'Sign in to restore your photos.' : 'Sign up to start restoring photos.'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {view === 'signup' && (
              <div>
                <label className={labelCls}>Name</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="Your name" required />
              </div>
            )}
            <div>
              <label className={labelCls}>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} placeholder="you@example.com" required />
            </div>
            <div>
              <label className={labelCls}>Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`${inputCls} pr-11`}
                  placeholder="••••••••"
                  required
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-500 hover:text-ink-300 transition-colors">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {view === 'login' && (
                <div className="flex justify-end mt-2">
                  <button type="button" onClick={() => setShowForgotModal(true)}
                    className="font-mono text-[10px] uppercase tracking-widest text-ink-500 hover:text-amber-400 transition-colors">
                    Forgot password?
                  </button>
                </div>
              )}
            </div>

            {error && <div className="text-rust-400 text-xs bg-rust-500/10 border border-rust-500/30 px-3 py-2">{error}</div>}
            {successMsg && (
              <div className="flex items-center gap-2 text-patina-400 text-xs bg-patina-500/10 border border-patina-500/30 px-3 py-2.5">
                <CheckCircle2 className="w-4 h-4 shrink-0" /> {successMsg}
              </div>
            )}

            <Button type="submit" className="w-full" isLoading={isLoading} icon={ArrowRight} disabled={isLoading}>
              {view === 'login' ? "Sign in" : "Create account"}
            </Button>
          </form>

          <div className="mt-8 pt-6 border-t border-ink-800 text-center">
            <button onClick={toggleView} disabled={isLoading}
              className="text-sm text-ink-500 hover:text-amber-400 transition-colors">
              {view === 'login' ? "Need an account? " : "Already registered? "}
              <span className="text-ink-300">{view === 'login' ? "Sign up" : "Sign in"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
