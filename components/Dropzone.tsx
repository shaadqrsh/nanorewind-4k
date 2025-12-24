import React, { useCallback, useState } from 'react';
import { UploadCloud, Image as ImageIcon, AlertCircle } from 'lucide-react';

interface DropzoneProps {
  onFileSelect: (file: File) => void;
}

export const Dropzone: React.FC<DropzoneProps> = ({ onFileSelect }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateFile = (file: File): boolean => {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setError("JPG, PNG, WebP only.");
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
      if (validateFile(file)) {
        onFileSelect(file);
      }
    }
  }, [onFileSelect]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (validateFile(file)) {
        onFileSelect(file);
      }
    }
  }, [onFileSelect]);

  return (
    <div className="flex flex-col gap-1 h-full">
        <label 
        className={`
            relative flex flex-col items-center justify-center w-full h-full border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200
            ${isDragOver 
            ? 'border-banana-500 bg-banana-500/10' 
            : error 
                ? 'border-red-500/50 bg-red-500/5 hover:bg-red-500/10'
                : 'border-slate-600 hover:border-banana-500/50 hover:bg-slate-800'
            }
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        >
        <div className="flex flex-col items-center justify-center text-center px-4">
            <UploadCloud className={`w-8 h-8 mb-2 transition-colors ${isDragOver ? 'text-banana-500 animate-bounce' : 'text-slate-500'}`} />
            <p className="text-xs text-slate-300 font-medium">
            <span className="font-semibold text-banana-400">Upload</span> or drag
            </p>
        </div>
        <input 
            type="file" 
            className="hidden" 
            accept="image/png, image/jpeg, image/webp"
            onChange={handleInputChange} 
        />
        </label>
        {error && (
            <div className="flex items-center gap-1 text-[10px] text-red-400 px-1">
                <AlertCircle className="w-2.5 h-2.5" />
                {error}
            </div>
        )}
    </div>
  );
};