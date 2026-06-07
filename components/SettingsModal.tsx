import React, { useState } from 'react';
import { X, User, Lock, Save, Mail } from 'lucide-react';
import { Button } from './Button';
import { authService } from '../services/auth';
import { User as UserType } from '../types';

interface SettingsModalProps {
  user: UserType;
  isOpen: boolean;
  onClose: () => void;
  onUpdateUser: (updatedUser: Partial<UserType>) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  user,
  isOpen,
  onClose,
  onUpdateUser
}) => {
  const [name, setName] = useState(user.name || '');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  if (!isOpen) return null;

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);
    try {
      await authService.updateProfile({ name });
      onUpdateUser({ name });
      setMessage({ type: 'success', text: 'Profile updated.' });
    } catch (err: any) {
      console.error(err);
      setMessage({ type: 'error', text: err.message || 'Failed to update profile' });
    } finally {
      setIsLoading(false);
    }
  };

  const inputCls =
    "w-full bg-ink-950 border border-ink-700 px-4 py-2.5 text-sm text-ink-100 " +
    "placeholder:text-ink-600 outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/30 transition-colors";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-ink-950/85 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg bg-ink-900 border border-ink-700 shadow-plate flex flex-col max-h-[90vh] animate-rise">
        <div className="absolute inset-0 hairline pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-ink-800">
          <div className="flex items-center gap-3">
            <span className="font-mono text-[10px] uppercase tracking-widest text-amber-500/80">Workstation</span>
            <h2 className="font-display text-lg font-semibold text-ink-100">Conservator settings</h2>
          </div>
          <button onClick={onClose} className="text-ink-500 hover:text-ink-200 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto">
          {message && (
            <div className={`mb-6 px-3 py-2.5 text-xs font-mono border flex items-center gap-2 ${
              message.type === 'success'
                ? 'bg-patina-500/10 text-patina-400 border-patina-500/30'
                : 'bg-rust-500/10 text-rust-400 border-rust-500/30'
            }`}>
              <span className="w-1.5 h-1.5 rounded-full bg-current" />
              {message.text}
            </div>
          )}

          <div className="space-y-8">
            {/* Profile */}
            <div>
              <h3 className="font-mono text-[10px] uppercase tracking-widest text-ink-500 mb-4 flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-amber-500" /> Profile
              </h3>
              <div className="space-y-5">
                <div>
                  <label className="block text-xs text-ink-400 mb-2">Email address</label>
                  <input type="email" disabled value={user.email} className={`${inputCls} !text-ink-500 cursor-not-allowed`} />
                  <p className="mt-1.5 text-[11px] text-ink-600">Email cannot be changed.</p>
                </div>

                <form onSubmit={handleUpdateProfile} className="space-y-5">
                  <div>
                    <label className="block text-xs text-ink-400 mb-2">Display name</label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} className={inputCls} />
                  </div>
                  <Button type="submit" isLoading={isLoading} icon={Save} className="w-full sm:w-auto">Save changes</Button>
                </form>
              </div>
            </div>

            <div className="h-px bg-ink-800" />

            {/* Security */}
            <div>
              <h3 className="font-mono text-[10px] uppercase tracking-widest text-ink-500 mb-4 flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-amber-500" /> Security
              </h3>
              <p className="text-sm text-ink-400 mb-4 leading-relaxed">
                Forgotten your key? We'll send a reset link to your inbox.
              </p>
              <Button
                onClick={async () => {
                  setIsLoading(true);
                  setMessage(null);
                  try {
                    await authService.resetPassword(user.email);
                    setMessage({ type: 'success', text: 'Reset email sent.' });
                  } catch (e: any) {
                    setMessage({ type: 'error', text: e.message || "Failed to send email" });
                  } finally {
                    setIsLoading(false);
                  }
                }}
                isLoading={isLoading}
                variant="secondary"
                icon={Mail}
                className="w-full sm:w-auto"
              >
                Send reset email
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
