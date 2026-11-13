import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from './Button';
import { Modal, Notice } from './Modal';
import { inputCls, labelCls } from './SettingsModal';
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
      setError((err as Error).message || 'The password could not be saved. Try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (done) {
    return (
      <Modal title="Password updated" z="z-[120]" onClose={onClose}>
        <p className="text-bone-2 mb-6">Use your new password the next time you sign in.</p>
        <Button onClick={onClose} className="w-full">Continue</Button>
      </Modal>
    );
  }

  return (
    <Modal title="Choose a new password" z="z-[120]" busy={isSaving}>
      <form onSubmit={handleSubmit}>
        <p className="text-bone-2 mb-6">Your reset link signed you in. Set a new password to finish.</p>
        <label htmlFor="new-password" className={labelCls}>New password</label>
        <div className="relative mb-5">
          <input id="new-password" type={show ? 'text' : 'password'} value={password}
            onChange={(e) => setPassword(e.target.value)} className={`${inputCls} pr-12`}
            placeholder="8 to 72 characters" minLength={8} maxLength={72}
            autoComplete="new-password" required />
          <button type="button" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'}
            className="absolute right-2 top-1/2 -translate-y-1/2 grid place-items-center w-9 h-9 rounded-full text-bone-3 hover:text-bone">
            {show ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
          </button>
        </div>
        {error && <Notice tone="error" className="mb-5">{error}</Notice>}
        <div className="flex gap-3">
          <Button variant="quiet" className="flex-1" onClick={onClose} disabled={isSaving}>Not now</Button>
          <Button type="submit" className="flex-1" isLoading={isSaving}>Save password</Button>
        </div>
      </form>
    </Modal>
  );
};
