import React, { useRef } from 'react';
import { Check, X, Plus, AlertCircle, Clock, Loader2, Ban } from 'lucide-react';
import { QueueItem } from '../hooks/useBatchQueue';
import { MAX_BATCH } from './Dropzone';
import { UPLOAD_TYPES } from '../utils/image';

interface BatchQueuePanelProps {
  items: QueueItem[];
  isRunning: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  onAddFiles: (files: File[]) => void;
  onClear: () => void;
}

const STATUS: Record<QueueItem['status'], { label: string; cls: string; Icon: typeof Check }> = {
  queued: { label: 'Waiting', cls: 'text-ink-400', Icon: Clock },
  restoring: { label: 'Restoring', cls: 'text-amber-400', Icon: Loader2 },
  done: { label: 'Done', cls: 'text-patina-400', Icon: Check },
  failed: { label: 'Failed', cls: 'text-rust-400', Icon: AlertCircle },
  skipped: { label: 'No credits left', cls: 'text-ink-400', Icon: Ban },
};

// The left-rail list for a batch: one row per photo with its status.
export const BatchQueuePanel: React.FC<BatchQueuePanelProps> = ({
  items, isRunning, selectedId, onSelect, onRemove, onAddFiles, onClear,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const done = items.filter(i => i.status === 'done').length;
  const room = MAX_BATCH - items.length;

  return (
    <div>
      <div className="flex items-center justify-between px-1 pb-2">
        <span className="font-mono text-[10px] uppercase tracking-widest text-ink-400" aria-live="polite">
          {done} of {items.length} restored
        </span>
        {!isRunning && (
          <div className="flex items-center gap-3">
            {room > 0 && (
              <button onClick={() => inputRef.current?.click()}
                className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest text-ink-400 hover:text-amber-400 transition-colors">
                <Plus className="w-3 h-3" /> Add
              </button>
            )}
            <button onClick={onClear}
              className="font-mono text-[10px] uppercase tracking-widest text-ink-400 hover:text-rust-400 transition-colors">
              Clear
            </button>
          </div>
        )}
        <input ref={inputRef} type="file" multiple className="hidden" accept={UPLOAD_TYPES.join(', ')}
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []).filter(f => UPLOAD_TYPES.includes(f.type)).slice(0, room);
            e.target.value = '';
            if (files.length) onAddFiles(files);
          }} />
      </div>

      <ul className="max-h-56 overflow-y-auto border border-ink-800 divide-y divide-ink-800/70">
        {items.map((item) => {
          const s = STATUS[item.status];
          const selected = item.id === selectedId;
          return (
            <li key={item.id} className={`group relative flex items-center gap-3 pr-2 border-l-2 transition-colors
              ${selected ? 'bg-amber-500/[0.06] border-amber-500' : 'border-transparent hover:bg-ink-850/60'}`}>
              <button onClick={() => onSelect(item.id)} aria-current={selected || undefined}
                className="flex flex-1 min-w-0 items-center gap-3 py-2 pl-2 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-500/60">
                <img src={item.file.previewUrl} alt="" className="w-10 h-10 shrink-0 object-cover border border-ink-700" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[12px] text-ink-200 truncate">{item.file.name}</span>
                  <span className={`flex items-center gap-1 text-[11px] ${s.cls}`}>
                    <s.Icon className={`w-3 h-3 shrink-0 ${item.status === 'restoring' ? 'animate-spin' : ''}`} />
                    <span className="truncate">
                      {item.status === 'failed' && item.error ? item.error
                        : item.status === 'done' && item.restoration === null ? 'Done, not saved to archive'
                          : s.label}
                    </span>
                  </span>
                </span>
              </button>
              {item.status !== 'restoring' && !isRunning && (
                <button onClick={() => onRemove(item.id)} aria-label={`Remove ${item.file.name}`}
                  className="p-1 text-ink-500 hover:text-rust-400 opacity-0 group-hover:opacity-100 focus:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              {item.status === 'restoring' && (
                <span className="absolute inset-x-0 bottom-0 h-0.5 overflow-hidden" aria-hidden="true">
                  <span className="block h-full w-1/3 bg-amber-500 animate-progress" />
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
};
