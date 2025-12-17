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
      setError("Only JPG, PNG, and WebP files are supported. Animated images (GIF, SVG) are not allowed.");
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
      } else {
        // Reset input so validation error can trigger again if same bad file is selected
        e.target.value = '';
      }
    }
  }, [onFileSelect]);

  return (
    <div className="flex flex-col gap-2">
        <label 
        className={`
            relative flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200
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
        <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4">
            {isDragOver ? (
            <UploadCloud className="w-12 h-12 text-banana-500 mb-4 animate-bounce" />
            ) : (
            <ImageIcon className={`w-12 h-12 mb-4 transition-colors ${error ? 'text-red-400' : 'text-slate-500 group-hover:text-banana-400'}`} />
            )}
            
            <p className="mb-2 text-sm text-slate-300 font-medium">
            <span className="font-semibold text-banana-400">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-slate-500">
            JPG, PNG, or WebP (Static images only)
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
            <div className="flex items-center gap-2 text-xs text-red-400 px-2 animate-in fade-in slide-in-from-top-1">
                <AlertCircle className="w-3 h-3" />
                {error}
            </div>
        )}
    </div>
  );
};