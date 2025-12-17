import React, { useState } from 'react';
import { History, LogOut, Zap, AlertTriangle } from 'lucide-react';
import { Countdown } from './Countdown';

interface HeaderProps {
  user: string | null;
  quota: { remaining: number; allowed: boolean; nextReset?: number } | null;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({ user, quota, onLogout }) => {
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  return (
    <>
      <header className="bg-slate-900/90 backdrop-blur-xl border-b border-slate-800 sticky top-0 z-50 shadow-lg">
        <div className="container mx-auto px-4 h-18 py-3 flex items-center justify-between">
          
          {/* Logo Section */}
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-banana-400 to-banana-600 shadow-lg shadow-banana-500/20">
              <History className="w-6 h-6 text-slate-900" strokeWidth={2.5} />
            </div>
            <div className="flex flex-col">
              <h1 className="text-xl font-bold text-white tracking-tight leading-none">
                NanoRewind <span className="text-banana-400">4K</span>
              </h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                 <span className="text-[10px] font-bold text-banana-400 bg-banana-500/10 border border-banana-500/20 px-2 py-0.5 rounded-full shadow-sm">
                   Powered by Nano Banana
                 </span>
              </div>
            </div>
          </div>

          {/* User & Controls Section */}
          {user && (
            <div className="flex items-center gap-4 sm:gap-6">
              
              {/* Credits Display */}
              <div className="flex flex-col items-end">
                <div className="flex items-center gap-2 mb-0.5">
                  <div className="text-[10px] uppercase tracking-wider font-bold text-slate-500">
                    Daily Credits
                  </div>
                  {quota?.nextReset && (
                    <Countdown 
                       targetDate={quota.nextReset} 
                       className="text-slate-500" 
                    />
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                   <Zap className={`w-4 h-4 ${quota?.allowed ? 'text-banana-400 fill-banana-400' : 'text-slate-600'}`} />
                   <span className={`text-lg font-bold ${quota?.allowed ? 'text-banana-400' : 'text-red-400'}`}>
                     {quota?.remaining || 0}
                   </span>
                   <span className="text-slate-600 text-sm font-medium">/ 3</span>
                </div>
              </div>

              <div className="h-8 w-px bg-slate-800 hidden sm:block"></div>

              {/* User Profile & Logout */}
              <div className="flex items-center gap-3">
                  <div className="hidden sm:flex flex-col items-end">
                      <span className="text-xs text-slate-400">Logged in as</span>
                      <span className="text-sm font-medium text-slate-200 max-w-[150px] truncate">{user}</span>
                  </div>
                  <button 
                    onClick={() => setShowLogoutConfirm(true)}
                    className="p-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all"
                    title="Sign Out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 max-w-sm w-full shadow-2xl transform transition-all scale-100 opacity-100">
            <div className="flex items-center gap-3 mb-4">
               <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                 <AlertTriangle className="w-5 h-5 text-red-400" />
               </div>
               <h3 className="text-xl font-bold text-white">Sign Out?</h3>
            </div>
            
            <p className="text-slate-400 mb-6 leading-relaxed">
              Are you sure you want to sign out of your account? Your restored image history in this session will be cleared.
            </p>
            
            <div className="flex gap-3">
               <button 
                 onClick={() => setShowLogoutConfirm(false)} 
                 className="flex-1 px-4 py-2.5 rounded-xl bg-slate-700 text-slate-200 hover:bg-slate-600 font-bold text-sm transition-colors"
               >
                 Cancel
               </button>
               <button 
                 onClick={() => { onLogout(); setShowLogoutConfirm(false); }} 
                 className="flex-1 px-4 py-2.5 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 font-bold text-sm transition-colors"
               >
                 Sign Out
               </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};