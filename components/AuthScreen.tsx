import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { authService } from '../services/auth';
import { Button } from './Button';
import { Notice } from './Modal';
import { inputCls, labelCls } from './SettingsModal';
import { PhotoSpread } from './PhotoSpread';
import { Wordmark } from './Wordmark';

export type AuthState = 'login' | 'signup';

interface AuthScreenProps {
  initialView: AuthState;
  notice?: string | null;   // why an email link did not sign the user in
  onAuthSuccess: () => void;
  onBack: () => void;
}

type Screen = AuthState | 'forgot';

const TITLES: Record<Screen, { h1: string; sub: string; crumb: string }> = {
  login: { h1: 'Sign in', sub: 'Sign in to restore photos and open your album.', crumb: 'Sign in' },
  signup: { h1: 'Create an account', sub: 'Free, with 3 restorations a day. No card needed.', crumb: 'Create an account' },
  forgot: { h1: 'Reset your password', sub: "Enter your email and we'll send you a link to choose a new password.", crumb: 'Reset password' },
};

const linkCls = 'underline decoration-rule decoration-[1.5px] underline-offset-4 hover:decoration-bone-3';

export const AuthScreen: React.FC<AuthScreenProps> = ({ initialView, notice, onAuthSuccess, onBack }) => {
  const [screen, setScreen] = useState<Screen>(initialView);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(notice ?? null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const switchTo = (next: Screen) => {
    setError(null);
    setSuccessMsg(null);
    setShowPassword(false);
    setScreen(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setError(null);
    setSuccessMsg(null);
    setIsLoading(true);

    try {
      if (screen === 'login') {
        const data = await authService.signIn({ email, password });
        if (data.session) onAuthSuccess();
      } else {
        const data = await authService.signUp({ email, password, name });
        if (data.session) {
          onAuthSuccess();
        } else if (data.user) {
          setSuccessMsg('Account created. Check your inbox and open the link in this browser to finish.');
          setScreen('login');
          setIsLoading(false);
        }
      }
    } catch (err) {
      setError((err as Error).message || 'Something went wrong. Try again.');
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
      await authService.resetPassword(email);
      setSuccessMsg(`Reset email sent to ${email}. Open the link in this browser.`);
      setScreen('login');
    } catch (err) {
      setError((err as Error).message || 'The email could not be sent. Try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const t = TITLES[screen];
  const home = (e: React.MouseEvent) => { e.preventDefault(); onBack(); };

  return (
    <div className="min-h-dvh grid lg:grid-cols-2">
      <aside className="hidden lg:flex flex-col justify-between gap-12 p-12 xl:p-16 bg-cover border-r border-rule">
        <a href="/" onClick={home} className="self-start" aria-label="NanoRewind 4K home"><Wordmark /></a>
        <div>
          <p className="font-display text-[clamp(32px,3vw,44px)] leading-[1.06] max-w-[16ch]">Bring old photos back to life</p>
          <PhotoSpread small className="mt-10 max-w-[520px]" />
        </div>
        <p className="text-[15px] text-bone-3">3 free restorations a day.</p>
      </aside>

      <div className="flex flex-col px-4 sm:px-12 py-6 sm:py-10">
        <nav aria-label="Breadcrumb" className="text-[15px]">
          <ol className="flex flex-wrap items-center gap-2 text-bone-3">
            <li><a href="/" onClick={home} className="hover:text-bone transition-colors">NanoRewind <span className="text-brass">4K</span></a></li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="text-bone-2">{t.crumb}</li>
          </ol>
        </nav>

        <div className="flex-1 grid place-items-center py-12">
          <div className="w-full max-w-sm">
            <h1 className="font-display text-[34px] leading-tight mb-2">{t.h1}</h1>
            <p className="text-bone-2 mb-8">{t.sub}</p>

            {screen === 'forgot' ? (
              <form onSubmit={handleResetPassword} className="flex flex-col gap-5">
                <div>
                  <label htmlFor="reset-email" className={labelCls}>Email</label>
                  <input id="reset-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    className={inputCls} placeholder="you@example.com" autoComplete="email" required autoFocus />
                </div>
                {error && <Notice tone="error">{error}</Notice>}
                <Button type="submit" className="w-full" isLoading={isLoading}>Send reset link</Button>
                <button type="button" onClick={() => switchTo('login')} disabled={isLoading}
                  className={`self-center text-[15px] text-bone-2 ${linkCls}`}>
                  Back to sign in
                </button>
              </form>
            ) : (
              <>
                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                  {screen === 'signup' && (
                    <div>
                      <label htmlFor="auth-name" className={labelCls}>Name</label>
                      <input id="auth-name" type="text" value={name} onChange={(e) => setName(e.target.value)}
                        className={inputCls} placeholder="Your name" autoComplete="name" required />
                    </div>
                  )}
                  <div>
                    <label htmlFor="auth-email" className={labelCls}>Email</label>
                    <input id="auth-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                      className={inputCls} placeholder="you@example.com" autoComplete="email" required />
                  </div>
                  <div>
                    <div className="flex items-baseline justify-between gap-3">
                      <label htmlFor="auth-password" className={labelCls}>Password</label>
                      {screen === 'login' && (
                        <button type="button" onClick={() => switchTo('forgot')} className={`mb-2 text-sm text-bone-2 ${linkCls}`}>
                          Forgot password?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        id="auth-password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={`${inputCls} pr-12`}
                        placeholder={screen === 'signup' ? '8 to 72 characters' : ''}
                        minLength={screen === 'signup' ? 8 : undefined}
                        maxLength={screen === 'signup' ? 72 : undefined}
                        autoComplete={screen === 'signup' ? 'new-password' : 'current-password'}
                        required
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        className="absolute right-2 top-1/2 -translate-y-1/2 grid place-items-center w-9 h-9 rounded-full text-bone-3 hover:text-bone">
                        {showPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
                      </button>
                    </div>
                  </div>

                  {error && <Notice tone="error">{error}</Notice>}
                  {successMsg && <Notice tone="ok">{successMsg}</Notice>}

                  <Button type="submit" className="w-full mt-1" isLoading={isLoading}>
                    {screen === 'login' ? 'Sign in' : 'Create account'}
                  </Button>
                </form>

                <p className="mt-8 pt-6 border-t border-rule text-center text-[15px] text-bone-2">
                  {screen === 'login' ? 'New here? ' : 'Already have an account? '}
                  <button type="button" onClick={() => switchTo(screen === 'login' ? 'signup' : 'login')} disabled={isLoading}
                    className={`font-bold text-bone ${linkCls}`}>
                    {screen === 'login' ? 'Create an account' : 'Sign in'}
                  </button>
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
