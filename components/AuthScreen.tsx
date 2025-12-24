import React, { useState } from 'react';
import { History, ArrowRight, ShieldCheck, Mail } from 'lucide-react';
import { auth } from '../services/auth';
import { Button } from './Button';

interface AuthScreenProps {
  onAuthSuccess: () => void;
}

type AuthState = 'login' | 'signup' | 'verify';

export const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthSuccess }) => {
  const [view, setView] = useState<AuthState>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setIsLoading(true);

    try {
      if (view === 'login') {
        const { error } = await auth.signIn({ email, password });
        if (error) throw error;
        onAuthSuccess();
      } else if (view === 'signup') {
        const { error } = await auth.signUp({ email, password });
        if (error) throw error;
        setView('verify');
        setSuccessMsg("Check your email for a verification code.");
      } else if (view === 'verify') {
        const { error } = await auth.verifyEmail({ email, code });
        if (error) throw error;
        setView('login');
        setSuccessMsg("Email verified successfully! You can now sign in.");
      }
    } catch (err: any) {
      setError(err.message || "Authentication failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-100 p-4">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-banana-500/5 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-[100px]"></div>
      </div>

      <div className="relative w-full max-w-md">
        <div className="bg-slate-800/80 border border-slate-700 rounded-3xl p-8 shadow-2xl backdrop-blur-xl">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-banana-400 to-banana-600 shadow-xl shadow-banana-500/20 mb-6">
              <History className="w-10 h-10 text-slate-900" strokeWidth={2.5} />
            </div>
            <h1 className="text-3xl font-bold mb-2 text-white">NanoRewind <span className="text-banana-400">4K</span></h1>
            <p className="text-slate-400 text-sm">
              {view === 'login' ? "Welcome back! Sign in to continue." : view === 'signup' ? "Create an account to start." : "Verify your email address."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {view !== 'verify' ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1.5 ml-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-banana-500 transition-all"
                    placeholder="you@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1.5 ml-1">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-banana-500 transition-all"
                    placeholder="••••••••"
                  />
                </div>
              </>
            ) : (
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1.5 ml-1">Verification Code</label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-banana-500 transition-all text-center tracking-widest font-bold"
                  placeholder="000000"
                />
              </div>
            )}

            {error && <div className="text-red-400 text-xs bg-red-400/10 p-2 rounded-lg border border-red-400/20">{error}</div>}
            {successMsg && <div className="text-green-400 text-xs bg-green-400/10 p-2 rounded-lg border border-green-400/20">{successMsg}</div>}

            <Button type="submit" className="w-full" isLoading={isLoading} icon={ArrowRight}>
              {view === 'login' ? "Sign In" : view === 'signup' ? "Create Account" : "Verify"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button 
              onClick={() => setView(view === 'login' ? 'signup' : 'login')}
              className="text-sm text-slate-400 hover:text-banana-400 transition-colors"
            >
              {view === 'login' ? "Need an account? Sign up" : view === 'signup' ? "Already have an account? Sign in" : "Back to sign in"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};