import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Download, Image as ImageIcon, Sparkles, Columns, MoveHorizontal, History, Trash2, AlertTriangle } from 'lucide-react';
import { RestorationStatus } from '../types';
import { Button } from './Button';

interface RestoredViewProps {
  originalUrl: string;
  originalName: string;
  restoredUrl: string | null;
  status: RestorationStatus;
  onRemove: () => void;
}

type ViewMode = 'original' | 'restored' | 'side-by-side' | 'slider';

const buildDownloadName = (name: string): string => {
  const base = name.replace(/\.[^./\\]+$/, '') || 'image';
  return `${base}_restored.png`;
};

export const RestoredView: React.FC<RestoredViewProps> = ({ originalUrl, originalName, restoredUrl, status, onRemove }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('slider');
  const [sliderPos, setSliderPos] = useState(50);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    setSliderPos((x / rect.width) * 100);
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => { isDragging.current = true; handleMove(e.clientX); };
  const handleTouchStart = (e: React.TouchEvent) => { isDragging.current = true; handleMove(e.touches[0].clientX); };

  useEffect(() => {
    const onMove = (e: MouseEvent) => { if (isDragging.current) handleMove(e.clientX); };
    const onUp = () => { isDragging.current = false; };
    const onTouch = (e: TouchEvent) => { if (isDragging.current) handleMove(e.touches[0].clientX); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onTouch);
    window.addEventListener('touchend', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onTouch);
      window.removeEventListener('touchend', onUp);
    };
  }, [handleMove]);

  // ── Developing state ──────────────────────────────────────────
  if (status === 'loading') {
    return (
      <div className="relative flex flex-col items-center justify-center w-full h-full p-12 overflow-hidden">
        {/* the plate, emerging from the bath */}
        <div className="relative w-44 h-44 mb-8 border border-ink-700 overflow-hidden bg-ink-950">
          <img
            src={originalUrl}
            alt="Developing"
            className="absolute inset-0 w-full h-full object-cover"
            style={{ filter: 'sepia(0.6) brightness(0.45) contrast(0.8)' }}
          />
          {/* scanning safelight */}
          <div className="absolute inset-x-0 h-1/3 bg-gradient-to-b from-transparent via-amber-500/25 to-transparent animate-scan" />
          {/* corner marks */}
          <span className="absolute top-1 left-1 w-2.5 h-2.5 border-t border-l border-amber-500/60" />
          <span className="absolute bottom-1 right-1 w-2.5 h-2.5 border-b border-r border-amber-500/60" />
        </div>
        <h3 className="font-display text-xl font-semibold text-ink-100 mb-2">Restoring your photo…</h3>
        <p className="font-mono text-[10px] uppercase tracking-widest text-ink-500 text-center max-w-xs leading-relaxed">
          This usually takes a few seconds
        </p>
        <div className="mt-5 flex items-center gap-1.5">
          {[0, 1, 2].map(i => (
            <span key={i} className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" style={{ animationDelay: `${i * 200}ms` }} />
          ))}
        </div>
      </div>
    );
  }

  // ── Loaded, not yet developed ─────────────────────────────────
  if (status === 'idle' || !restoredUrl) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-6">
        <div className="relative max-w-full">
          <img src={originalUrl} alt="Original Preview" className="max-w-full max-h-[400px] object-contain border border-ink-700 shadow-plate" />
          <span className="absolute top-2 left-2 font-mono text-[9px] uppercase tracking-widest text-ink-300 bg-ink-950/70 px-1.5 py-0.5">
            Original
          </span>
        </div>
        <div className="mt-5 flex flex-col items-center gap-3">
          <p className="font-mono text-[10px] uppercase tracking-widest text-ink-500">Ready · press “Restore photo” to start</p>
          <button onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-ink-500 hover:text-rust-400 transition-colors">
            <Trash2 className="w-3 h-3" /> Remove photo
          </button>
        </div>

        {showDeleteConfirm && (
          <div className="absolute inset-0 z-50 grid place-items-center bg-ink-950/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-xs bg-ink-900 border border-ink-700 shadow-plate p-6">
              <h3 className="font-display text-lg font-semibold text-ink-100 mb-2">Remove photo?</h3>
              <p className="text-ink-400 text-sm mb-5">This clears the current image.</p>
              <div className="flex gap-2">
                <Button onClick={() => setShowDeleteConfirm(false)} variant="secondary" className="flex-1 !py-2 !px-3">Cancel</Button>
                <Button onClick={() => { onRemove(); setShowDeleteConfirm(false); }} variant="danger" className="flex-1 !py-2 !px-3">Remove</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Developed ─────────────────────────────────────────────────
  const tabs: { mode: ViewMode; label: string; Icon: typeof ImageIcon }[] = [
    { mode: 'original', label: 'Original', Icon: ImageIcon },
    { mode: 'restored', label: 'Restored', Icon: Sparkles },
    { mode: 'slider', label: 'Compare', Icon: MoveHorizontal },
    { mode: 'side-by-side', label: 'Split', Icon: Columns },
  ];

  return (
    <div className="flex flex-col w-full h-full relative animate-develop">
      {/* Toolbar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 px-4 py-3 bg-ink-900/80 border-b border-ink-800 backdrop-blur-sm z-10">
        <div className="flex flex-wrap gap-1.5 justify-center md:justify-start">
          {tabs.map(({ mode, label, Icon }) => {
            const active = viewMode === mode;
            return (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`flex items-center gap-2 px-3 py-2 font-mono text-[11px] uppercase tracking-widest transition-colors border
                  ${active
                    ? 'bg-amber-500/10 border-amber-500/40 text-amber-400'
                    : 'bg-transparent border-ink-700 text-ink-400 hover:text-ink-200 hover:border-ink-600'}`}
              >
                <Icon className="w-3.5 h-3.5" /> {label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowDeleteConfirm(true)}
            title="Discard"
            className="p-2.5 text-ink-400 hover:text-rust-400 border border-ink-700 hover:border-rust-500/40 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <Button href={restoredUrl} download={buildDownloadName(originalName)} icon={Download} className="!py-2.5 !px-5">
            Save 4K
          </Button>
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="absolute inset-0 z-50 grid place-items-center bg-ink-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-ink-900 border border-ink-700 shadow-plate p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="grid place-items-center w-10 h-10 bg-rust-500/10 border border-rust-500/30">
                <AlertTriangle className="w-5 h-5 text-rust-400" />
              </div>
              <h3 className="font-display text-lg font-semibold text-ink-100">Remove photo?</h3>
            </div>
            <p className="text-ink-400 text-sm mb-5">The restored result will be lost.</p>
            <div className="flex gap-2">
              <Button onClick={() => setShowDeleteConfirm(false)} variant="secondary" className="flex-1 !py-2 !px-4">Cancel</Button>
              <Button onClick={() => { onRemove(); setShowDeleteConfirm(false); }} variant="danger" className="flex-1 !py-2 !px-4">Remove</Button>
            </div>
          </div>
        </div>
      )}

      {/* Image stage - dark checkerboard tray */}
      <div
        className="flex-grow relative w-full overflow-hidden flex items-center justify-center p-5"
        style={{
          backgroundColor: '#0c0a09',
          backgroundImage:
            'linear-gradient(45deg, #161311 25%, transparent 25%), linear-gradient(-45deg, #161311 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #161311 75%), linear-gradient(-45deg, transparent 75%, #161311 75%)',
          backgroundSize: '22px 22px',
          backgroundPosition: '0 0, 0 11px, 11px -11px, -11px 0',
        }}
      >
        {viewMode === 'original' && (
          <img src={originalUrl} alt="Original" className="max-w-full max-h-full object-contain shadow-2xl border border-ink-700" />
        )}

        {viewMode === 'restored' && (
          <img src={restoredUrl} alt="Restored" className="max-w-full max-h-full object-contain shadow-2xl border border-amber-500/30" />
        )}

        {viewMode === 'side-by-side' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full h-full">
            <figure className="flex flex-col items-center justify-center min-h-0 h-full">
              <figcaption className="mb-2 font-mono text-[9px] uppercase tracking-widest text-ink-500">Original</figcaption>
              <div className="relative w-full h-full flex items-center justify-center overflow-hidden border border-ink-700">
                <img src={originalUrl} className="w-full h-full object-cover" alt="Original" />
              </div>
            </figure>
            <figure className="flex flex-col items-center justify-center min-h-0 h-full">
              <figcaption className="mb-2 font-mono text-[9px] uppercase tracking-widest text-amber-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Restored
              </figcaption>
              <div className="relative w-full h-full flex items-center justify-center overflow-hidden border border-amber-500/40">
                <img src={restoredUrl} className="w-full h-full object-cover" alt="Restored" />
              </div>
            </figure>
          </div>
        )}

        {viewMode === 'slider' && (
          <div
            ref={containerRef}
            className="relative w-full h-full max-w-4xl max-h-[70vh] cursor-ew-resize select-none overflow-hidden shadow-2xl bg-ink-950 border border-ink-700"
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
          >
            <img src={restoredUrl} alt="Restored" className="absolute inset-0 w-full h-full object-cover" draggable={false} />
            <div className="absolute inset-0 w-full h-full overflow-hidden" style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}>
              <img src={originalUrl} alt="Original" className="absolute inset-0 w-full h-full object-cover" draggable={false} />
            </div>

            {/* Handle */}
            <div className="absolute top-0 bottom-0 w-px bg-amber-500 shadow-[0_0_12px_rgba(224,164,88,0.7)] z-20 pointer-events-none" style={{ left: `${sliderPos}%` }}>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-9 h-9 bg-ink-950 border border-amber-500 grid place-items-center shadow-safelight">
                <MoveHorizontal className="w-4 h-4 text-amber-500" />
              </div>
            </div>

            {/* Drag hint */}
            <span className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-widest text-ink-200 bg-ink-950/70 px-2.5 py-1 pointer-events-none">
              <MoveHorizontal className="w-3 h-3 text-amber-500" /> Drag to compare
            </span>

            <span className="absolute bottom-3 left-3 font-mono text-[9px] uppercase tracking-widest text-ink-200 bg-ink-950/70 px-2 py-1 pointer-events-none">Original</span>
            <span className="absolute bottom-3 right-3 font-mono text-[9px] uppercase tracking-widest text-ink-950 bg-amber-500 px-2 py-1 pointer-events-none">Restored</span>
          </div>
        )}
      </div>
    </div>
  );
};
