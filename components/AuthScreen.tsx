import React, { useState } from 'react';
import { History, ArrowRight, ShieldCheck, Mail, User, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { getAuth } from '../services/auth';
import { Button } from './Button';

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    setError(null);
    setSuccessMsg(null);
    setIsLoading(true);

    try {
      const auth = getAuth();
      if (view === 'login') {
        const { error } = await auth.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // Auth state listener in App.tsx will handle the rest
      } else if (view === 'signup') {
        const { data, error } = await auth.auth.signUp({
          email,
          password,
          options: {
            data: { name }
          }
        });
        if (error) throw error;

        if (data.session) {
          // User verified or auto-login worked
          onAuthSuccess();
        } else if (data.user) {
          setSuccessMsg("Account created! Please check your email to verify your account before signing in.");
          setView('login');
          setIsLoading(false);
          return;
        }
      }
    } catch (err: any) {
      setError(err.message || "Authentication failed");
      setIsLoading(false);
    }
    // We don't unset isLoading here if successful login, because App.tsx will unmount us or we want to prevent interaction
  };

  const toggleView = () => {
    setError(null);
    setSuccessMsg(null);
    setShowPassword(false);
    if (view === 'login') setView('signup');
    else setView('login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-4 transition-colors duration-300">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-banana-500/5 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-[100px]"></div>
      </div>

      <div className="relative w-full max-w-md">
        <div className="bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-3xl p-8 shadow-2xl backdrop-blur-xl">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-banana-400 to-banana-600 shadow-xl shadow-banana-500/20 mb-6">
              <History className="w-10 h-10 text-slate-900" strokeWidth={2.5} />
            </div>
            <h1 className="text-3xl font-bold mb-2 text-slate-900 dark:text-white">NanoRewind <span className="text-banana-500 dark:text-banana-400">4K</span></h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              {view === 'login' ? "Welcome back! Sign in to continue." : "Create an account to start."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {view === 'signup' && (
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1.5 ml-1">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-banana-500 transition-all text-slate-900 dark:text-white"
                  placeholder="Your Name"
                  required
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1.5 ml-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-banana-500 transition-all text-slate-900 dark:text-white"
                placeholder="you@example.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1.5 ml-1">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-banana-500 transition-all text-slate-900 dark:text-white pr-10"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && <div className="text-red-500 dark:text-red-400 text-xs bg-red-50 dark:bg-red-400/10 p-2 rounded-lg border border-red-200 dark:border-red-400/20">{error}</div>}

            {successMsg && (
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-xs bg-green-50 dark:bg-green-400/10 p-3 rounded-lg border border-green-200 dark:border-green-400/20 font-medium animate-in zoom-in-95">
                <CheckCircle2 className="w-4 h-4" /> {successMsg}
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              isLoading={isLoading}
              icon={ArrowRight}
              disabled={isLoading}
            >
              {view === 'login' ? "Sign In" : "Create Account"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={toggleView}
              className="text-sm text-slate-500 hover:text-banana-500 dark:text-slate-400 dark:hover:text-banana-400 transition-colors"
              disabled={isLoading}
            >
              {view === 'login' ? "Need an account? Sign up" : "Already have an account? Sign in"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};