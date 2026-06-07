import React, { useEffect, useRef, useState } from 'react';
import { MoveHorizontal, Sparkles } from 'lucide-react';

// Auto-sweeping before/after reveal for the landing page.
// Mirrors the manual compare slider in RestoredView, but animates on a loop
// (and still responds to hover/drag so a visitor can take over).

interface BeforeAfterShowcaseProps {
  beforeSrc: string;
  afterSrc: string;
  className?: string;
}

export const BeforeAfterShowcase: React.FC<BeforeAfterShowcaseProps> = ({ beforeSrc, afterSrc, className = '' }) => {
  const [pos, setPos] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number>(0);
  const interactingRef = useRef(false);

  // Auto-sweep: a slow ease-in-out wipe that ping-pongs left<->right.
  useEffect(() => {
    const PERIOD = 5200; // ms for a full back-and-forth cycle

    const tick = (now: number) => {
      if (!startRef.current) startRef.current = now;
      if (!interactingRef.current) {
        const t = ((now - startRef.current) % PERIOD) / PERIOD; // 0..1
        // triangle wave 0->1->0, then ease for a natural glide
        const tri = t < 0.5 ? t * 2 : (1 - t) * 2;
        const eased = tri * tri * (3 - 2 * tri); // smoothstep
        setPos(8 + eased * 84); // sweep between 8% and 92%
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const moveTo = (clientX: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    setPos((x / rect.width) * 100);
  };

  const handleEnter = () => { interactingRef.current = true; };
  const handleLeave = () => { interactingRef.current = false; startRef.current = 0; };

  return (
    <div className={`relative ${className}`}>
      {/* Plate frame with registration marks */}
      <div
        ref={containerRef}
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
        onMouseMove={(e) => interactingRef.current && moveTo(e.clientX)}
        onTouchStart={(e) => { handleEnter(); moveTo(e.touches[0].clientX); }}
        onTouchMove={(e) => moveTo(e.touches[0].clientX)}
        onTouchEnd={handleLeave}
        className="group relative aspect-[4/3] w-full overflow-hidden border border-ink-700 bg-ink-950 shadow-plate cursor-ew-resize select-none"
      >
        {/* After (restored) — full bleed underneath */}
        <img src={afterSrc} alt="Restored" className="absolute inset-0 w-full h-full object-cover" draggable={false} />

        {/* Before (faded) — clipped to the left of the wipe */}
        <div className="absolute inset-0 w-full h-full overflow-hidden" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
          <img src={beforeSrc} alt="Original" className="absolute inset-0 w-full h-full object-cover" draggable={false} />
        </div>

        {/* Wipe handle */}
        <div
          className="absolute top-0 bottom-0 w-px bg-amber-500 shadow-[0_0_12px_rgba(224,164,88,0.7)] z-20 pointer-events-none"
          style={{ left: `${pos}%` }}
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-ink-950 border border-amber-500 grid place-items-center shadow-safelight">
            <MoveHorizontal className="w-3.5 h-3.5 text-amber-500" />
          </div>
        </div>

        {/* Corner registration marks */}
        <span className="absolute top-2 left-2 w-3 h-3 border-t border-l border-amber-500/50 z-10 pointer-events-none" />
        <span className="absolute bottom-2 right-2 w-3 h-3 border-b border-r border-amber-500/50 z-10 pointer-events-none" />

        {/* Labels */}
        <span className="absolute bottom-3 left-3 z-10 font-mono text-[9px] uppercase tracking-widest text-ink-200 bg-ink-950/70 px-2 py-1 pointer-events-none">
          Faded original
        </span>
        <span className="absolute bottom-3 right-3 z-10 flex items-center gap-1 font-mono text-[9px] uppercase tracking-widest text-ink-950 bg-amber-500 px-2 py-1 pointer-events-none">
          <Sparkles className="w-2.5 h-2.5" /> Restored 4K
        </span>
      </div>

      {/* Caption */}
      <p className="mt-3 flex items-center gap-2 font-mono text-[9px] uppercase tracking-widest text-ink-600">
        <span className="w-1 h-1 rounded-full bg-amber-500 animate-pulse" />
        Drag to compare · live restoration preview
      </p>
    </div>
  );
};
