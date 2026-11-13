import React, { useCallback, useRef, useState } from 'react';
import { UPLOAD_TYPES } from '../utils/image';
import { buttonClass } from './Button';

interface DropzoneProps {
  onFilesSelect: (files: File[]) => void;
}

export const MAX_BATCH = 10;

// The empty workspace: an empty album slot that takes dropped or chosen photos.
export const Dropzone: React.FC<DropzoneProps> = ({ onFilesSelect }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keeps the usable photos and explains anything that was left out.
  const accept = useCallback((list: FileList | null) => {
    if (!list || list.length === 0) return;
    const all = Array.from(list);
    const images = all.filter(f => UPLOAD_TYPES.includes(f.type));
    const kept = images.slice(0, MAX_BATCH);
    if (images.length < all.length) setError('Some files were skipped. Only JPG, PNG and WebP photos work.');
    else if (kept.length < images.length) setError(`You can add up to ${MAX_BATCH} photos at a time, so the first ${MAX_BATCH} were added.`);
    else setError(null);
    if (kept.length > 0) onFilesSelect(kept);
  }, [onFilesSelect]);

  return (
    <div className="w-full max-w-[600px] mx-auto">
      <div
        className={`mount aspect-[4/3] grid place-items-center text-center px-6 rounded-[2px] transition-colors
          ${isDragOver ? 'bg-brass/10' : 'bg-panel'}`}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={(e) => { e.preventDefault(); setIsDragOver(false); }}
        onDrop={(e) => { e.preventDefault(); setIsDragOver(false); accept(e.dataTransfer.files); }}
      >
        <div className="flex flex-col items-center gap-4 max-w-sm">
          <h2 className="font-display text-[28px] leading-tight">{isDragOver ? 'Drop to add' : 'Add a photo'}</h2>
          <p className="text-bone-2">
            Drop a scan or a phone photo of the print here. JPG, PNG or WebP, up to {MAX_BATCH} at once.
          </p>
          <button type="button" onClick={() => inputRef.current?.click()} className={`${buttonClass('primary')} mt-1`}>
            Choose photos
          </button>
        </div>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept={UPLOAD_TYPES.join(', ')}
          multiple
          onChange={(e) => { accept(e.target.files); e.target.value = ''; }}
        />
      </div>
      {error && <p role="alert" className="mt-4 text-[15px] text-rust text-center">{error}</p>}
    </div>
  );
};
