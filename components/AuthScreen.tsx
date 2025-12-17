import React, { useState } from 'react';
import { History, ArrowRight } from 'lucide-react';
import { authService } from '../services/auth';
import { Button } from './Button';

interface AuthScreenProps {
  onAuthSuccess: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }

    setIsLoading(true);

    try {
      if (isLogin) {
        const res = await authService.login(email, password);
        if (res.success) {
          onAuthSuccess();
        } else {
          setError(res.error || "Invalid email or password");
        }
      } else {
        const res = await authService.signup(email, password);
        if (res.success) {
          setIsLogin(true);
          setPassword('');
          setSuccessMsg("Account created successfully! Please check your email to verify your account before signing in.");
        } else {
          setError(res.error || "Failed to create account");
        }
      }
    } catch (err: any) {
        setError(err.message || "An unexpected error occurred");
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-100 p-4">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-banana-500/5 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-[100px]"></div>
      </div>

      <div className="relative w-full max-w-md">
        <div className="bg-slate-800/80 border border-slate-700 rounded-3xl p-8 shadow-2xl backdrop-blur-xl">
          
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-banana-400 to-banana-600 shadow-xl shadow-banana-500/20 mb-6 group transform hover:scale-105 transition-transform duration-300">
              <History className="w-10 h-10 text-slate-900" strokeWidth={2.5} />
            </div>
            <h1 className="text-3xl font-bold mb-2 text-white">
              NanoRewind <span className="text-banana-400">4K</span>
            </h1>
            <p className="text-slate-400 text-sm">
              {isLogin ? "Welcome back! Sign in to restore your memories." : "Create an account to start restoring."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1.5 ml-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 focus:ring-2 focus:ring-banana-500 focus:border-transparent outline-none transition-all placeholder:text-slate-600"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1.5 ml-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 focus:ring-2 focus:ring-banana-500 focus:border-transparent outline-none transition-all placeholder:text-slate-600"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-300 text-sm text-center">
                {error}
              </div>
            )}
            
            {successMsg && (
              <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-green-300 text-sm text-center">
                {successMsg}
              </div>
            )}

            <Button
              type="submit"
              className="w-full mt-2"
              icon={ArrowRight}
              isLoading={isLoading}
            >
              {isLogin ? "Sign In" : "Create Account"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError(null);
                setSuccessMsg(null);
                setPassword('');
              }}
              className="text-sm text-slate-400 hover:text-banana-400 transition-colors"
            >
              {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};