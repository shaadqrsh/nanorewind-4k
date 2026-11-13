import React, { useState } from 'react';
import { Eye, EyeOff, KeyRound, CheckCircle2 } from 'lucide-react';
import { Button } from './Button';
import { authService } from '../services/auth';

interface NewPasswordModalProps {
  onClose: () => void;
}

// Shown after a password-reset link signs the user in, so they can actually
// set the new password.
export const NewPasswordModal: React.FC<NewPasswordModalProps> = ({ onClose }) => {
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      await authService.updatePassword(password);
      setDone(true);
    } catch (err) {
      setError((err as Error).message || 'Could not save the password');
    } finally {
      setIsSaving(false);
    }
  };

  const inputCls =
    'w-full bg-ink-950 border border-ink-700 px-4 py-2.5 pr-11 text-sm text-ink-100 ' +
    'placeholder:text-ink-600 outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/30 transition-colors';

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-ink-950/85 backdrop-blur-sm p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="new-password-title"
        className="relative w-full max-w-md bg-ink-900 border border-ink-700 shadow-plate p-8 animate-rise">
        <div className="absolute inset-0 hairline pointer-events-none" />

        {done ? (
          <div className="text-center">
            <CheckCircle2 className="w-8 h-8 text-patina-400 mx-auto mb-4" />
            <h2 id="new-password-title" className="font-display text-2xl font-semibold text-ink-100 mb-2">Password updated</h2>
            <p className="text-ink-400 text-sm mb-6">Use your new password next time you sign in.</p>
            <Button onClick={onClose} className="w-full">Continue</Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="grid place-items-center w-11 h-11 mb-5 border border-ink-700 bg-ink-950">
              <KeyRound className="w-5 h-5 text-amber-500" />
            </div>
            <h2 id="new-password-title" className="font-display text-2xl font-semibold text-ink-100 mb-2">Choose a new password</h2>
            <p className="text-ink-400 text-sm mb-6">You're signed in from your reset link. Set a new password to finish.</p>

            <label htmlFor="new-password" className="block font-mono text-[10px] uppercase tracking-widest text-ink-500 mb-2">
              New password
            </label>
            <div className="relative mb-4">
              <input id="new-password" type={show ? 'text' : 'password'} value={password}
                onChange={(e) => setPassword(e.target.value)} className={inputCls}
                placeholder="8 to 72 characters" minLength={8} maxLength={72}
                autoComplete="new-password" required autoFocus />
              <button type="button" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-500 hover:text-ink-300 transition-colors">
                {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {error && <p className="mb-4 text-rust-400 text-xs bg-rust-500/10 border border-rust-500/30 px-3 py-2">{error}</p>}

            <div className="flex gap-3">
              <Button type="button" onClick={onClose} variant="secondary" className="flex-1" disabled={isSaving}>Not now</Button>
              <Button type="submit" className="flex-1" isLoading={isSaving}>Save</Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
