import React, { useCallback, useEffect, useRef, useState } from 'react';
import { RestorationStatus } from '../types';
import { Button } from './Button';
import { Modal } from './Modal';
import { downloadImage, restoredFilename } from '../utils/image';

interface RestoredViewProps {
  title: string;
  originalUrl: string;
  originalName: string;
  restoredUrl: string | null;
  status: RestorationStatus;
  archived: boolean;            // true when this result is saved in the album
  treatment: string | null;     // style used for the result, e.g. "Sepia, deeper shadows"
  onRemove: () => void;
  onShare?: () => void;         // shown when the result is in the album
}

type Mode = 'loupe' | 'slider' | 'pair';
const MODES: { mode: Mode; label: string }[] = [
  { mode: 'pair', label: 'Side by side' },
  { mode: 'slider', label: 'Slider' },
  { mode: 'loupe', label: 'Loupe' },
];
const MODE_KEY = 'nanorewind:view-mode';
const ZOOM = 2.4;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

// Natural pixel size of an image, once it has loaded.
const useNaturalSize = (url: string | null) => {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  useEffect(() => {
    setSize(null);
    if (!url) return;
    const img = new Image();
    img.onload = () => setSize({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = url;
    return () => { img.onload = null; };
  }, [url]);
  return size;
};

const savedMode = (): Mode => {
  try {
    const m = localStorage.getItem(MODE_KEY);
    return m === 'slider' || m === 'loupe' ? m : 'pair';
  } catch {
    return 'pair';
  }
};

// The restored photo, magnified, inside a lens over the original. The lens
// follows the mouse, can be dragged or tapped into place, and moves with the
// arrow keys. It stays inside the photo.
const Loupe: React.FC<{ baseUrl: string; lensUrl: string }> = ({ baseUrl, lensUrl }) => {
  const stageRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [pt, setPt] = useState({ x: 0.5, y: 0.4 });

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const measure = () => setBox({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const moveTo = (clientX: number, clientY: number) => {
    const r = stageRef.current!.getBoundingClientRect();
    setPt({ x: clamp((clientX - r.left) / r.width, 0, 1), y: clamp((clientY - r.top) / r.height, 0, 1) });
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const s = e.shiftKey ? 0.1 : 0.03;
    const moves: Record<string, [number, number]> = { ArrowLeft: [-s, 0], ArrowRight: [s, 0], ArrowUp: [0, -s], ArrowDown: [0, s] };
    const m = moves[e.key];
    if (!m) return;
    e.preventDefault();
    setPt(p => ({ x: clamp(p.x + m[0], 0, 1), y: clamp(p.y + m[1], 0, 1) }));
  };

  const D = Math.round(clamp(box.w * 0.4, 130, 250));
  const inner = D - 14; // inside the 7px rim
  const cx = clamp(pt.x * box.w, D / 2, box.w - D / 2);
  const cy = clamp(pt.y * box.h, D / 2, box.h - D / 2);

  return (
    <div
      ref={stageRef}
      className="absolute inset-0 cursor-crosshair select-none touch-pan-y"
      onPointerMove={(e) => { if (e.pointerType === 'mouse' || dragging.current) moveTo(e.clientX, e.clientY); }}
      onPointerDown={(e) => { dragging.current = true; e.currentTarget.setPointerCapture(e.pointerId); moveTo(e.clientX, e.clientY); }}
      onPointerUp={() => { dragging.current = false; }}
      onPointerCancel={() => { dragging.current = false; }}
    >
      <img src={baseUrl} alt="Original photo" draggable={false} className="absolute inset-0 w-full h-full object-cover pointer-events-none" />
      {box.w > 0 && (
        <div
          role="img"
          tabIndex={0}
          aria-label={`Loupe showing the restored photo at ${ZOOM} times. Use the arrow keys to move it.`}
          onKeyDown={onKeyDown}
          className="absolute left-0 top-0 z-[6] rounded-full border-[7px] border-lens bg-lens bg-no-repeat touch-none cursor-grab active:cursor-grabbing shadow-[0_0_0_1.5px_rgb(var(--corner))] focus-visible:outline-offset-4"
          style={{
            width: D,
            height: D,
            transform: `translate(${cx - D / 2}px, ${cy - D / 2}px)`,
            backgroundImage: `url("${lensUrl}")`,
            backgroundSize: `${box.w * ZOOM}px ${box.h * ZOOM}px`,
            backgroundPosition: `${-(cx * ZOOM - inner / 2)}px ${-(cy * ZOOM - inner / 2)}px`,
          }}
        >
          <span className="absolute left-1/2 top-[calc(100%+8px)] -translate-x-1/2 px-2.5 py-1 rounded-full bg-lens text-bone text-[13px] font-bold whitespace-nowrap pointer-events-none">
            After, {ZOOM}×
          </span>
        </div>
      )}
    </div>
  );
};

// Drag-to-reveal slider: the original on the left of the line, the restoration on the right.
const Compare: React.FC<{ beforeUrl: string; afterUrl: string }> = ({ beforeUrl, afterUrl }) => {
  const elRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const [pos, setPos] = useState(50);

  const fromX = (clientX: number) => {
    const r = elRef.current!.getBoundingClientRect();
    setPos(clamp(((clientX - r.left) / r.width) * 100, 0, 100));
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 10 : 2;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') setPos(p => clamp(p - step, 0, 100));
    else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') setPos(p => clamp(p + step, 0, 100));
    else if (e.key === 'Home') setPos(0);
    else if (e.key === 'End') setPos(100);
    else return;
    e.preventDefault();
  };

  return (
    <div
      ref={elRef}
      className="absolute inset-0 overflow-hidden cursor-ew-resize select-none touch-pan-y"
      onPointerDown={(e) => { dragging.current = true; e.currentTarget.setPointerCapture(e.pointerId); fromX(e.clientX); }}
      onPointerMove={(e) => { if (dragging.current) fromX(e.clientX); }}
      onPointerUp={() => { dragging.current = false; }}
      onPointerCancel={() => { dragging.current = false; }}
    >
      <img src={afterUrl} alt="Restored photo" draggable={false} className="absolute inset-0 w-full h-full object-cover pointer-events-none" />
      <img src={beforeUrl} alt="Original photo" draggable={false} className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }} />
      <div className="absolute inset-y-0 w-0.5 -ml-px bg-bone pointer-events-none" style={{ left: `${pos}%` }} />
      <div
        role="slider"
        tabIndex={0}
        aria-label="Compare before and after"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pos)}
        aria-valuetext={`${Math.round(pos)}% before`}
        onKeyDown={onKeyDown}
        className="absolute top-1/2 z-[6] grid place-items-center w-11 h-11 -translate-x-1/2 -translate-y-1/2 rounded-full bg-lens border-2 border-bone"
        style={{ left: `${pos}%` }}
      >
        <span className="w-2.5 h-3.5 border-x-2 border-bone" aria-hidden="true" />
      </div>
      <span className="absolute top-3.5 left-4 px-2.5 py-1 rounded-full bg-lens text-bone text-[13px] font-bold pointer-events-none">Before</span>
      <span className="absolute top-3.5 right-4 px-2.5 py-1 rounded-full bg-bone text-lens text-[13px] font-bold pointer-events-none">After</span>
    </div>
  );
};

// One photo at its own shape inside photo corners, with a placeholder while it loads.
const MountedPhoto: React.FC<{ src: string; alt: string; dim?: boolean; children?: React.ReactNode }> = ({ src, alt, dim, children }) => {
  // Tracks which src has loaded, so a new src shows the placeholder again. A
  // cached image can finish before effects run, so also check img.complete.
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  useEffect(() => {
    const img = imgRef.current;
    if (img?.complete && img.naturalWidth > 0) setLoadedSrc(src);
  }, [src]);
  const loaded = loadedSrc === src;
  return (
    <div className="mount w-fit max-w-full mx-auto">
      {!loaded && <div className="w-[min(80vw,420px)] aspect-[4/3] bg-panel animate-breathe" aria-hidden="true" />}
      <img ref={imgRef} src={src} alt={alt} onLoad={() => setLoadedSrc(src)}
        className={`${loaded ? 'block' : 'hidden'} max-w-full max-h-[60vh] w-auto h-auto ${dim ? 'opacity-55' : ''}`} />
      {children}
    </div>
  );
};

export const RestoredView: React.FC<RestoredViewProps> = ({
  title, originalUrl, originalName, restoredUrl, status, archived, treatment, onRemove, onShare,
}) => {
  const [mode, setModeState] = useState<Mode>(savedMode);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const restoredSize = useNaturalSize(restoredUrl);
  const originalSize = useNaturalSize(originalUrl);
  const done = status === 'success' && !!restoredUrl;

  const setMode = useCallback((m: Mode) => {
    setModeState(m);
    try { localStorage.setItem(MODE_KEY, m); } catch { /* private mode */ }
  }, []);

  useEffect(() => setDownloadError(null), [restoredUrl]);

  const handleDownload = async () => {
    if (!restoredUrl) return;
    setIsDownloading(true);
    setDownloadError(null);
    try {
      await downloadImage(restoredUrl, restoredFilename(originalName));
    } catch (err) {
      setDownloadError((err as Error).message || 'The download failed. Try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  // The loupe and slider frame takes the restored photo's shape, capped to the screen height.
  const ratio = restoredSize ? restoredSize.w / restoredSize.h : 1;
  const frameStyle = { width: `min(100%, ${(60 * ratio).toFixed(2)}vh)`, aspectRatio: `${ratio}` };
  const px = (s: { w: number; h: number } | null) => (s ? `${s.w} × ${s.h} px` : '');

  let stage: React.ReactNode;
  if (status === 'loading') {
    stage = (
      <div className="flex flex-col items-center gap-6">
        <MountedPhoto src={originalUrl} alt="Your photo, being restored" dim>
          <span className="absolute inset-x-0 bottom-0 h-1 overflow-hidden bg-cover/70" aria-hidden="true">
            <span className="block h-full w-1/3 bg-brass animate-progress" />
          </span>
        </MountedPhoto>
        <div className="text-center" role="status">
          <p className="font-display text-2xl">Restoring your photo</p>
          <p className="text-bone-2 mt-1">This can take up to a minute.</p>
        </div>
      </div>
    );
  } else if (!done) {
    stage = (
      <div className="flex flex-col items-center gap-6">
        <MountedPhoto src={originalUrl} alt="Your photo" />
        <p className="text-bone-2 text-center max-w-md">Choose a style, then press Restore.</p>
      </div>
    );
  } else if (mode === 'pair') {
    stage = (
      <div className="grid grid-cols-2 items-start gap-5 sm:gap-10 w-full max-w-[860px]">
        <figure className="min-w-0">
          <div className="mount mount-sm"><img src={originalUrl} alt="Original photo" className="block w-full h-auto" /></div>
          <figcaption className="mt-4 text-[15px] text-bone-2"><b className="block text-bone">Before</b>{px(originalSize)}</figcaption>
        </figure>
        <figure className="min-w-0">
          <div className="mount mount-sm"><img src={restoredUrl!} alt="Restored photo" className="block w-full h-auto" /></div>
          <figcaption className="mt-4 text-[15px] text-bone-2"><b className="block text-bone">After</b>{px(restoredSize)}</figcaption>
        </figure>
      </div>
    );
  } else {
    stage = (
      <div className="w-full flex flex-col items-center gap-5">
        <div className="mount mx-auto" style={frameStyle}>
          {mode === 'loupe'
            ? <Loupe baseUrl={originalUrl} lensUrl={restoredUrl!} />
            : <Compare beforeUrl={originalUrl} afterUrl={restoredUrl!} />}
        </div>
        <p className="text-[15px] text-bone-3 text-center">
          {mode === 'loupe' ? 'Move the loupe over the photo, or tap where you want it.' : 'Drag the line to compare.'}
        </p>
      </div>
    );
  }

  return (
    <section className="flex flex-col gap-6 min-w-0" aria-label="Your photo">
      <div className="flex flex-wrap items-center justify-between gap-3.5">
        <h1 className="font-display text-[clamp(30px,3.4vw,40px)] leading-[1.05]">{title}</h1>
        {done && (
          <div className="flex flex-wrap gap-1" role="group" aria-label="View">
            {MODES.map(({ mode: m, label }) => (
              <button key={m} type="button" onClick={() => setMode(m)} aria-pressed={mode === m}
                className={`px-3.5 py-[7px] rounded-full border-[1.5px] text-[15px] transition-colors
                  ${mode === m ? 'bg-bone border-bone text-page font-bold' : 'border-rule text-bone-2 hover:text-bone hover:border-bone-3'}`}>
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid place-items-center py-2 sm:py-6 min-h-[340px]">{stage}</div>

      <div className="flex flex-wrap items-end justify-between gap-4 pt-[18px] border-t border-rule">
        <div className="min-w-0 text-[15px]">
          <p className="font-bold truncate">{originalName}</p>
          {done ? (
            archived
              ? <p className="text-bone-2">Restored in {treatment ? treatment.toLowerCase() : 'your chosen style'}. Saved to your album.</p>
              : <p className="text-rust">This result wasn't saved to your album. Download it to keep it.</p>
          ) : (
            <p className="text-bone-2">{status === 'loading' ? 'Restoring' : 'Not restored yet'}{originalSize ? `, ${px(originalSize)}` : ''}</p>
          )}
          {downloadError && <p role="alert" className="text-rust mt-1">{downloadError}</p>}
        </div>
        {status !== 'loading' && (
          <div className="flex flex-wrap gap-2.5">
            {done && onShare && <Button variant="quiet" size="sm" onClick={onShare}>Share</Button>}
            {done && !archived
              ? <Button variant="danger" size="sm" onClick={() => setConfirmDiscard(true)}>Discard</Button>
              : <Button variant="quiet" size="sm" onClick={onRemove}>{done ? 'Close' : 'Remove'}</Button>}
            {done && <Button size="sm" onClick={handleDownload} isLoading={isDownloading}>Download</Button>}
          </div>
        )}
      </div>

      {confirmDiscard && (
        <Modal title="Discard this result?" size="sm" onClose={() => setConfirmDiscard(false)}>
          <p className="text-bone-2 mb-6">It wasn't saved to your album, so it will be lost. Download it first if you want to keep it.</p>
          <div className="flex gap-3">
            <Button variant="quiet" className="flex-1" onClick={() => setConfirmDiscard(false)}>Cancel</Button>
            <Button variant="danger" className="flex-1" onClick={() => { setConfirmDiscard(false); onRemove(); }}>Discard</Button>
          </div>
        </Modal>
      )}
    </section>
  );
};
