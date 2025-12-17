import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Download, Eye, Image as ImageIcon, Sparkles, Columns, MoveHorizontal, History } from 'lucide-react';
import { RestorationStatus } from '../types';
import { Button } from './Button';

interface RestoredViewProps {
  originalUrl: string;
  restoredUrl: string | null;
  status: RestorationStatus;
}

type ViewMode = 'original' | 'restored' | 'side-by-side' | 'slider';

export const RestoredView: React.FC<RestoredViewProps> = ({ originalUrl, restoredUrl, status }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('slider');
  const [sliderPos, setSliderPos] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  // Handle Slider Interactions
  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percentage = (x / rect.width) * 100;
    setSliderPos(percentage);
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    handleMove(e.clientX);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    isDragging.current = true;
    handleMove(e.touches[0].clientX);
  };

  useEffect(() => {
    const handleGlobalMove = (e: MouseEvent) => {
      if (isDragging.current) {
        handleMove(e.clientX);
      }
    };
    
    const handleGlobalUp = () => {
      isDragging.current = false;
    };
    
    const handleGlobalTouchMove = (e: TouchEvent) => {
      if (isDragging.current) {
        handleMove(e.touches[0].clientX);
      }
    };

    window.addEventListener('mousemove', handleGlobalMove);
    window.addEventListener('mouseup', handleGlobalUp);
    window.addEventListener('touchmove', handleGlobalTouchMove);
    window.addEventListener('touchend', handleGlobalUp);

    return () => {
      window.removeEventListener('mousemove', handleGlobalMove);
      window.removeEventListener('mouseup', handleGlobalUp);
      window.removeEventListener('touchmove', handleGlobalTouchMove);
      window.removeEventListener('touchend', handleGlobalUp);
    };
  }, [handleMove]);

  if (status === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full p-12">
        <div className="relative w-24 h-24 mb-6">
          <div className="absolute inset-0 border-4 border-slate-700 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-banana-500 rounded-full border-t-transparent animate-spin"></div>
          <div className="absolute inset-0 m-auto w-12 h-12 rounded-xl bg-gradient-to-br from-banana-400 to-banana-600 flex items-center justify-center shadow-lg animate-pulse">
            <History className="w-7 h-7 text-slate-900" strokeWidth={2.5} />
          </div>
        </div>
        <h3 className="text-xl font-bold text-slate-200 mb-2">Restoring Image...</h3>
        <p className="text-slate-400 text-center max-w-sm">
          Applying Sony A1 simulation, geometry correction, and 4K enhancements...
        </p>
      </div>
    );
  }

  if (status === 'idle' || !restoredUrl) {
    return (
        <div className="w-full h-full flex flex-col items-center justify-center p-4">
            <img 
                src={originalUrl} 
                alt="Original Preview" 
                className="max-w-full max-h-[400px] object-contain rounded-lg shadow-lg border border-slate-700" 
            />
            <p className="mt-4 text-slate-400 text-sm">Ready to restore. Click the button on the left.</p>
        </div>
    );
  }

  return (
    <div className="flex flex-col w-full h-full">
      {/* View Toggle Toolbar & Download Actions */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 bg-slate-900/80 border-b border-slate-800 backdrop-blur-sm z-10">
        <div className="flex flex-wrap gap-2 justify-center md:justify-start">
            <button
                onClick={() => setViewMode('original')}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === 'original' ? 'bg-slate-700 text-white shadow-lg' : 'bg-slate-800 text-slate-400 hover:text-slate-200'}`}
            >
                <ImageIcon className="w-4 h-4" /> Original
            </button>
            <button
                onClick={() => setViewMode('restored')}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === 'restored' ? 'bg-banana-500/20 text-banana-400 shadow-lg border border-banana-500/30' : 'bg-slate-800 text-slate-400 hover:text-slate-200'}`}
            >
                <Sparkles className="w-4 h-4" /> Restored
            </button>
            <button
                onClick={() => setViewMode('slider')}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === 'slider' ? 'bg-slate-700 text-white shadow-lg' : 'bg-slate-800 text-slate-400 hover:text-slate-200'}`}
            >
                <MoveHorizontal className="w-4 h-4" /> Slider
            </button>
            <button
                onClick={() => setViewMode('side-by-side')}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === 'side-by-side' ? 'bg-slate-700 text-white shadow-lg' : 'bg-slate-800 text-slate-400 hover:text-slate-200'}`}
            >
                <Columns className="w-4 h-4" /> Side by Side
            </button>
        </div>

        <Button 
          href={restoredUrl} 
          download="nanorewind-restored-4k.png"
          icon={Download}
          className="whitespace-nowrap py-2 px-5 text-sm"
        >
          Download 4K
        </Button>
      </div>

      {/* Main Image Area */}
      <div className="flex-grow relative w-full overflow-hidden bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] bg-slate-950 flex items-center justify-center p-4">
        
        {viewMode === 'original' && (
           <img src={originalUrl} alt="Original" className="max-w-full max-h-full object-contain rounded shadow-2xl" />
        )}

        {viewMode === 'restored' && (
           <img src={restoredUrl} alt="Restored" className="max-w-full max-h-full object-contain rounded shadow-2xl border-2 border-banana-500/20" />
        )}

        {viewMode === 'side-by-side' && (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full h-full">
                 <div className="flex flex-col items-center justify-center min-h-0 h-full">
                    <span className="mb-2 text-xs font-bold text-slate-500 uppercase tracking-wider">Original</span>
                    <div className="relative w-full h-full flex items-center justify-center overflow-hidden rounded-lg border border-slate-700/50">
                        <img src={originalUrl} className="w-full h-full object-cover" alt="Original" />
                    </div>
                 </div>
                 <div className="flex flex-col items-center justify-center min-h-0 h-full">
                    <span className="mb-2 text-xs font-bold text-banana-500 uppercase tracking-wider flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> Restored
                    </span>
                    <div className="relative w-full h-full flex items-center justify-center overflow-hidden rounded-lg border-2 border-banana-500/30">
                        <img src={restoredUrl} className="w-full h-full object-cover" alt="Restored" />
                    </div>
                 </div>
            </div>
        )}

        {viewMode === 'slider' && (
            <div 
                ref={containerRef}
                className="relative w-full h-full max-w-4xl max-h-[70vh] cursor-ew-resize select-none overflow-hidden rounded-lg shadow-2xl group bg-black"
                onMouseDown={handleMouseDown}
                onTouchStart={handleTouchStart}
            >
                {/* Background Image (Restored) - Right Side */}
                <img 
                    src={restoredUrl} 
                    alt="Restored" 
                    className="absolute inset-0 w-full h-full object-cover"
                    draggable={false}
                />
                
                {/* Overlay Image (Original) - Left Side */}
                <div 
                    className="absolute inset-0 w-full h-full overflow-hidden"
                    style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
                >
                    <img 
                        src={originalUrl} 
                        alt="Original" 
                        className="absolute inset-0 w-full h-full object-cover"
                        draggable={false}
                    />
                </div>

                {/* Slider Handle */}
                <div 
                    className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_10px_rgba(0,0,0,0.5)] z-20 pointer-events-none"
                    style={{ left: `${sliderPos}%` }}
                >
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-xl">
                        <MoveHorizontal className="w-5 h-5 text-slate-800" />
                    </div>
                </div>

                {/* Labels */}
                <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded text-xs font-bold text-white pointer-events-none">Original</div>
                <div className="absolute bottom-4 right-4 bg-banana-500/90 backdrop-blur-md px-3 py-1 rounded text-xs font-bold text-slate-900 pointer-events-none">Restored</div>
            </div>
        )}

      </div>
    </div>
  );
};