import React, { useState } from 'react';
import { X, Moon, Sun, User, Lock, Save, Loader2, Eye, EyeOff } from 'lucide-react';
import { Button } from './Button';
import { getAuth } from '../services/auth';
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
  const [activeTab, setActiveTab] = useState<'profile' | 'security'>('profile');
  const [name, setName] = useState(user.name || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  if (!isOpen) return null;

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);
    try {
      const auth = getAuth();
      // @ts-ignore - updateUser exists on the client
      const { error } = await auth.updateUser({
        name: name
      });
      
      if (error) throw error;
      
      onUpdateUser({ name });
      setMessage({ type: 'success', text: 'Profile updated successfully' });
    } catch (err: any) {
      console.error(err);
      setMessage({ type: 'error', text: err.message || 'Failed to update profile' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);
    try {
      const auth = getAuth();
      // @ts-ignore - updateUser exists on the client for password changes
      const { error } = await auth.updateUser({
        password: newPassword
      });

      if (error) throw error;
      
      setMessage({ type: 'success', text: 'Password updated successfully' });
      setCurrentPassword('');
      setNewPassword('');
    } catch (err: any) {
      console.error(err);
      setMessage({ type: 'error', text: err.message || 'Failed to update password' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col overflow-hidden max-h-[85vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Settings</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-col md:flex-row flex-grow overflow-hidden">
          
          {/* Sidebar */}
          <div className="w-full md:w-48 bg-slate-50 dark:bg-slate-950 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 flex md:flex-col shrink-0">
            <button 
              onClick={() => setActiveTab('profile')}
              className={`flex-1 md:flex-none flex items-center gap-3 px-4 py-3 md:py-4 text-sm font-medium transition-colors ${activeTab === 'profile' ? 'bg-white dark:bg-slate-900 text-banana-600 dark:text-banana-400 border-b-2 md:border-b-0 md:border-l-2 border-banana-500' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900'}`}
            >
              <User className="w-4 h-4" /> Profile
            </button>
            <button 
              onClick={() => setActiveTab('security')}
              className={`flex-1 md:flex-none flex items-center gap-3 px-4 py-3 md:py-4 text-sm font-medium transition-colors ${activeTab === 'security' ? 'bg-white dark:bg-slate-900 text-banana-600 dark:text-banana-400 border-b-2 md:border-b-0 md:border-l-2 border-banana-500' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900'}`}
            >
              <Lock className="w-4 h-4" /> Security
            </button>
          </div>

          {/* Panel */}
          <div className="flex-grow p-6 overflow-y-auto bg-white dark:bg-slate-900">
            {message && (
              <div className={`mb-4 p-3 rounded-lg text-sm flex items-center gap-2 ${message.type === 'success' ? 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400'}`}>
                {message.type === 'success' ? <div className="w-2 h-2 rounded-full bg-current" /> : <div className="w-2 h-2 rounded-full bg-current" />}
                {message.text}
              </div>
            )}

            {activeTab === 'profile' && (
              <div className="space-y-6">
                <div className="space-y-4">
                   <div>
                     <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email Address</label>
                     <input type="email" disabled value={user.email} className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-500 dark:text-slate-400 cursor-not-allowed" />
                     <p className="mt-1 text-xs text-slate-500">Email cannot be changed.</p>
                   </div>
                   
                   <form onSubmit={handleUpdateProfile} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Display Name</label>
                        <input 
                            type="text" 
                            value={name} 
                            onChange={e => setName(e.target.value)}
                            className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-banana-500 outline-none" 
                        />
                    </div>
                    <div className="pt-2">
                        <Button type="submit" isLoading={isLoading} icon={Save} className="w-full md:w-auto py-2.5">Save Changes</Button>
                    </div>
                   </form>
                </div>

                <div className="border-t border-slate-200 dark:border-slate-800 pt-6">
                    <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Appearance</h3>
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
                            <span className={`${isDark ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition`}/>
                        </button>
                    </div>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <form onSubmit={handleUpdatePassword} className="space-y-4">
                 <div>
                     <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Current Password</label>
                     <div className="relative">
                         <input 
                            type={showCurrentPassword ? "text" : "password"}
                            value={currentPassword}
                            onChange={e => setCurrentPassword(e.target.value)}
                            className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-banana-500 outline-none pr-10"
                         />
                         <button
                            type="button"
                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            tabIndex={-1}
                          >
                            {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                     </div>
                     <p className="mt-1 text-xs text-slate-500">Not required if authenticated via OTP.</p>
                 </div>
                 <div>
                     <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">New Password</label>
                     <div className="relative">
                        <input 
                            type={showNewPassword ? "text" : "password"}
                            value={newPassword}
                            onChange={e => setNewPassword(e.target.value)}
                            className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-banana-500 outline-none pr-10"
                        />
                        <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            tabIndex={-1}
                          >
                            {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                     </div>
                 </div>
                 <div className="pt-2">
                    <Button type="submit" isLoading={isLoading} icon={Save} className="w-full md:w-auto py-2.5">Update Password</Button>
                 </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};