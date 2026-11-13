import React, { useState } from 'react';
import { Button } from './Button';
import { Modal, Notice } from './Modal';
import { authService } from '../services/auth';
import { User as UserType } from '../types';
import { PATHS } from '../utils/routes';

interface SettingsModalProps {
  user: UserType;
  isOpen: boolean;
  onClose: () => void;
  onUpdateUser: (updatedUser: Partial<UserType>) => void;
  onDeleteAll: () => Promise<void>;
  canDeleteAll: boolean;   // false while a restoration is running
}

// Text fields. The border is strong enough (3:1) to see where the field is,
// and focus thickens it to a 2px brass ring.
export const inputCls =
  'w-full min-w-0 bg-cover border border-bone-3/70 rounded px-4 py-3 text-bone placeholder:text-bone-3 ' +
  'outline-none focus:border-brass focus:shadow-[0_0_0_1px_rgb(var(--brass))] focus-visible:outline-none transition-colors';
export const labelCls = 'block font-bold text-[15px] mb-2';

// The visible box for a checkbox whose <input> is `peer sr-only` right before it.
export const checkboxCls =
  'relative shrink-0 w-[22px] h-[22px] mt-px rounded border-[1.5px] border-bone-3 transition-colors ' +
  'peer-checked:bg-bone peer-checked:border-bone peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-brass peer-focus-visible:outline-offset-[3px] ' +
  "after:content-[''] after:absolute after:left-[6.5px] after:top-[2px] after:w-[5px] after:h-[11px] after:rotate-45 " +
  'after:border-page after:border-r-[2.5px] after:border-b-[2.5px] after:opacity-0 peer-checked:after:opacity-100';

const linkCls = 'text-bone-2 underline decoration-rule decoration-[1.5px] underline-offset-4 hover:text-bone hover:decoration-bone-3';

export const SettingsModal: React.FC<SettingsModalProps> = ({ user, isOpen, onClose, onUpdateUser, onDeleteAll, canDeleteAll }) => {
  const [name, setName] = useState(user.name || '');
  const [busy, setBusy] = useState<'profile' | 'reset' | 'delete' | null>(null);
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy('profile');
    setMessage(null);
    try {
      await authService.updateProfile({ name });
      onUpdateUser({ name: name.trim() || undefined });
      setMessage({ tone: 'ok', text: name.trim() ? 'Name saved.' : 'Name removed.' });
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

  const handleDeleteAll = async () => {
    setBusy('delete');
    setDeleteError(null);
    try {
      await onDeleteAll();
      setConfirmDelete(false);
      setMessage({ tone: 'ok', text: 'All your photos were deleted, and their share links turned off.' });
    } catch (err) {
      setDeleteError((err as Error).message || 'Your photos could not be deleted. Try again.');
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
            <label htmlFor="settings-name" className={labelCls}>Display name <span className="font-normal text-bone-3">(optional)</span></label>
            <input id="settings-name" type="text" value={name} onChange={e => setName(e.target.value)} className={inputCls}
              autoComplete="name" maxLength={80} aria-describedby="settings-name-hint" />
            <p id="settings-name-hint" className="mt-1.5 text-sm text-bone-3">Only shown to you, in the account menu. Leave it empty to remove it.</p>
          </div>
          <Button type="submit" isLoading={busy === 'profile'} disabled={busy !== null} className="self-start">Save name</Button>
        </form>
      </section>

      <section className="py-7 border-b border-rule">
        <h3 className="font-display text-xl mb-2">Password</h3>
        <p className="text-bone-2 mb-4">We'll email you a link to choose a new password.</p>
        <Button variant="quiet" onClick={handleReset} isLoading={busy === 'reset'} disabled={busy !== null}>Send reset email</Button>
      </section>

      <section className="pt-7">
        <h3 className="font-display text-xl mb-2">Your data</h3>
        <p className="text-bone-2 mb-4">
          Delete every photo in your album: the originals, the restored copies and their share links. This can't be undone.
        </p>
        <Button variant="danger" onClick={() => { setDeleteError(null); setConfirmDelete(true); }} disabled={busy !== null || !canDeleteAll}>
          Delete all my photos
        </Button>
        {!canDeleteAll && <p className="mt-2 text-sm text-bone-3">Wait for the restoration to finish first.</p>}
        <p className="mt-4 text-sm text-bone-3">
          Your sign-in stays, so you can keep using NanoRewind. To remove your account completely or get a copy of your
          data, see <a href={`${PATHS.privacy}#your-rights`} target="_blank" rel="noopener" className={linkCls}>your rights in the privacy policy</a>.
        </p>
      </section>

      {confirmDelete && (
        <Modal title="Delete all your photos?" size="sm" busy={busy === 'delete'} onClose={() => setConfirmDelete(false)} z="z-[110]">
          <p className="text-bone-2 mb-5">
            Every original and restored photo in your album will be deleted for good, and all your share links will stop
            working. Download anything you want to keep first.
          </p>
          {deleteError && <Notice tone="error" className="mb-5">{deleteError}</Notice>}
          <div className="flex gap-3">
            <Button variant="quiet" className="flex-1" disabled={busy === 'delete'} onClick={() => setConfirmDelete(false)}>Cancel</Button>
            <Button variant="danger" className="flex-1" isLoading={busy === 'delete'} onClick={handleDeleteAll}>Delete all</Button>
          </div>
        </Modal>
      )}
    </Modal>
  );
};
