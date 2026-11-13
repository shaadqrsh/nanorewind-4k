import React, { useState } from 'react';
import { Button } from './Button';
import { Modal, Notice } from './Modal';
import { authService } from '../services/auth';
import { User as UserType } from '../types';

interface SettingsModalProps {
  user: UserType;
  isOpen: boolean;
  onClose: () => void;
  onUpdateUser: (updatedUser: Partial<UserType>) => void;
}

export const inputCls =
  'w-full min-w-0 bg-cover border border-rule rounded px-4 py-3 text-bone placeholder:text-bone-3 ' +
  'outline-none focus:border-brass focus-visible:outline-none transition-colors';
export const labelCls = 'block font-bold text-[15px] mb-2';

export const SettingsModal: React.FC<SettingsModalProps> = ({ user, isOpen, onClose, onUpdateUser }) => {
  const [name, setName] = useState(user.name || '');
  const [busy, setBusy] = useState<'profile' | 'reset' | null>(null);
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy('profile');
    setMessage(null);
    try {
      await authService.updateProfile({ name });
      onUpdateUser({ name });
      setMessage({ tone: 'ok', text: 'Name saved.' });
    } catch (err) {
      setMessage({ tone: 'error', text: (err as Error).message || 'Your name could not be saved. Try again.' });
    } finally {
      setBusy(null);
    }
  };

  const handleReset = async () => {
    setBusy('reset');
    setMessage(null);
    try {
      await authService.resetPassword(user.email);
      setMessage({ tone: 'ok', text: `Reset email sent to ${user.email}. Open the link in this browser.` });
    } catch (err) {
      setMessage({ tone: 'error', text: (err as Error).message || 'The email could not be sent. Try again.' });
    } finally {
      setBusy(null);
    }
  };

  return (
    <Modal title="Settings" size="lg" busy={busy !== null} onClose={onClose}>
      {message && <Notice tone={message.tone} className="mt-2 mb-6">{message.text}</Notice>}

      <section className="pt-3 pb-7 border-b border-rule">
        <h3 className="font-display text-xl mb-4">Profile</h3>
        <div className="mb-5">
          <label htmlFor="settings-email" className={labelCls}>Email</label>
          <input id="settings-email" type="email" disabled value={user.email} className={`${inputCls} text-bone-3 cursor-not-allowed`} />
          <p className="mt-1.5 text-sm text-bone-3">Your email can't be changed.</p>
        </div>
        <form onSubmit={handleUpdateProfile} className="flex flex-col gap-5">
          <div>
            <label htmlFor="settings-name" className={labelCls}>Display name</label>
            <input id="settings-name" type="text" value={name} onChange={e => setName(e.target.value)} className={inputCls} autoComplete="name" />
          </div>
          <Button type="submit" isLoading={busy === 'profile'} disabled={busy !== null} className="self-start">Save name</Button>
        </form>
      </section>

      <section className="pt-7">
        <h3 className="font-display text-xl mb-2">Password</h3>
        <p className="text-bone-2 mb-4">We'll email you a link to choose a new password.</p>
        <Button variant="quiet" onClick={handleReset} isLoading={busy === 'reset'} disabled={busy !== null}>Send reset email</Button>
      </section>
    </Modal>
  );
};
