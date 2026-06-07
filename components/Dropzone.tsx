import React, { useCallback, useState } from 'react';
import { Plus, AlertCircle } from 'lucide-react';

interface DropzoneProps {
  onFileSelect: (file: File) => void;
}

export const Dropzone: React.FC<DropzoneProps> = ({ onFileSelect }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateFile = (file: File): boolean => {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setError("JPG · PNG · WebP only.");
      return false;
    }
    setError(null);
    return true;
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (validateFile(file)) onFileSelect(file);
    }
  }, [onFileSelect]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (validateFile(file)) onFileSelect(file);
    }
  }, [onFileSelect]);

  return (
    <div className="flex flex-col gap-1.5 h-full">
      <label
        className={`group relative flex flex-col items-center justify-center w-full h-full cursor-pointer transition-colors duration-200
          ${isDragOver
            ? 'bg-amber-500/[0.07]'
            : error
              ? 'bg-rust-500/[0.05]'
              : 'bg-ink-950/40 hover:bg-ink-900/60'
          }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Dashed easel frame */}
        <span
          className={`absolute inset-1.5 border border-dashed transition-colors duration-200
            ${isDragOver ? 'border-amber-500' : error ? 'border-rust-500/50' : 'border-ink-600 group-hover:border-amber-500/40'}`}
        />
        {/* Corner registration marks */}
        {['top-0 left-0 border-t border-l', 'top-0 right-0 border-t border-r', 'bottom-0 left-0 border-b border-l', 'bottom-0 right-0 border-b border-r'].map((pos) => (
          <span key={pos} className={`absolute w-2.5 h-2.5 ${pos} ${isDragOver ? 'border-amber-500' : 'border-ink-500'}`} />
        ))}

        <div className="relative flex flex-col items-center text-center px-4">
          <Plus
            className={`w-6 h-6 mb-2 transition-all duration-200 ${isDragOver ? 'text-amber-500 rotate-90' : 'text-ink-400 group-hover:text-amber-500/70'}`}
            strokeWidth={1.5}
          />
          <p className="font-mono text-[10px] uppercase tracking-widest text-ink-300">
            Click to upload
          </p>
          <p className="mt-0.5 text-[10px] text-ink-500">or drag a photo here · JPG, PNG, WebP</p>
        </div>

        <input
          type="file"
          className="hidden"
          accept="image/png, image/jpeg, image/webp"
          onChange={handleInputChange}
        />
      </label>
      {error && (
        <div className="flex items-center gap-1.5 font-mono text-[10px] text-rust-400 px-1">
          <AlertCircle className="w-3 h-3" />
          {error}
        </div>
      )}
    </div>
  );
};
