import React, { useState } from 'react';
import { X, Moon, Sun, User, Lock, Save, Loader2, Mail } from 'lucide-react';
import { Button } from './Button';
import { authService } from '../services/auth';
import { User as UserType } from '../types';

interface SettingsModalProps {
  user: UserType;
  isOpen: boolean;
  onClose: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
  onUpdateUser: (updatedUser: Partial<UserType>) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  user,
  isOpen,
  onClose,
  isDark,
  onToggleTheme,
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
      setMessage({ type: 'success', text: 'Profile updated successfully' });
    } catch (err: any) {
      console.error(err);
      setMessage({ type: 'error', text: err.message || 'Failed to update profile' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">

        {/* Content */}
        <div className="p-6 overflow-y-auto">
          {message && (
            <div className={`mb-6 p-3 rounded-lg text-sm flex items-center gap-2 ${message.type === 'success' ? 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400'}`}>
              {message.type === 'success' ? <div className="w-2 h-2 rounded-full bg-current" /> : <div className="w-2 h-2 rounded-full bg-current" />}
              {message.text}
            </div>
          )}

          <div className="space-y-8">
            {/* Profile Section */}
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-banana-500" /> Profile
              </h3>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email Address</label>
                  <input type="email" disabled value={user.email} className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-500 dark:text-slate-400 cursor-not-allowed" />
                  <p className="mt-1 text-xs text-slate-500">Email cannot be changed.</p>
                </div>

                <form onSubmit={handleUpdateProfile} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Display Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-banana-500 outline-none"
                    />
                  </div>
                  <div>
                    <Button type="submit" isLoading={isLoading} icon={Save} className="w-full md:w-auto py-2.5">Save Changes</Button>
                  </div>
                </form>
              </div>
            </div>

            <div className="h-px bg-slate-200 dark:bg-slate-800" />

            {/* Appearance Section */}
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <Moon className="w-5 h-5 text-banana-500" /> Appearance
              </h3>
              <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${isDark ? 'bg-indigo-500/10 text-indigo-400' : 'bg-orange-500/10 text-orange-500'}`}>
                    {isDark ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                  </div>
                  <span className="font-medium text-slate-700 dark:text-slate-200">{isDark ? 'Dark Mode' : 'Light Mode'}</span>
                </div>
                <button
                  onClick={onToggleTheme}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-banana-500 focus:ring-offset-2 focus:ring-offset-slate-900 ${isDark ? 'bg-slate-700' : 'bg-slate-300'}`}
                >
                  <span className={`${isDark ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition`} />
                </button>
              </div>
            </div>

            <div className="h-px bg-slate-200 dark:bg-slate-800" />

            {/* Security Section */}
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <Lock className="w-5 h-5 text-banana-500" /> Security
              </h3>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Forgot your password? Click below to receive a reset email.</p>

                <Button
                  onClick={async () => {
                    setIsLoading(true);
                    setMessage(null);
                    try {
                      await authService.resetPassword(user.email);
                      setMessage({ type: 'success', text: 'Reset email sent!' });
                    } catch (e: any) {
                      setMessage({ type: 'error', text: e.message || "Failed to send email" });
                    } finally {
                      setIsLoading(false);
                    }
                  }}
                  isLoading={isLoading}
                  variant="secondary"
                  icon={Mail}
                  className="w-full md:w-auto !bg-slate-100 !text-slate-900 dark:!bg-slate-800 dark:!text-white shadow-none hover:!bg-slate-200 dark:hover:!bg-slate-700 border border-slate-200 dark:border-slate-700"
                >
                  Send Reset Email
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};