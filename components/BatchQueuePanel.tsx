import React, { useRef } from 'react';
import { X } from 'lucide-react';
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

const STATUS: Record<QueueItem['status'], { label: string; cls: string }> = {
  queued: { label: 'Waiting', cls: 'text-bone-3' },
  restoring: { label: 'Restoring', cls: 'text-brass' },
  done: { label: 'Done', cls: 'text-sage' },
  failed: { label: 'Failed', cls: 'text-rust' },
  skipped: { label: 'Waiting for credits', cls: 'text-bone-3' },
};

// The photo list for a batch: one row per photo with its status.
export const BatchQueuePanel: React.FC<BatchQueuePanelProps> = ({
  items, isRunning, selectedId, onSelect, onRemove, onAddFiles, onClear,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const done = items.filter(i => i.status === 'done').length;
  const room = MAX_BATCH - items.length;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[15px] text-bone-2" aria-live="polite">{done} of {items.length} restored</p>
        {!isRunning && (
          <div className="flex items-center gap-4 text-[15px]">
            {room > 0 && (
              <button type="button" onClick={() => inputRef.current?.click()}
                className="text-bone-2 underline decoration-rule decoration-[1.5px] underline-offset-4 hover:text-bone hover:decoration-bone-3">
                Add photos
              </button>
            )}
            <button type="button" onClick={onClear}
              className="text-bone-2 underline decoration-rule decoration-[1.5px] underline-offset-4 hover:text-rust hover:decoration-rust">
              Clear all
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

      <ul className="max-h-72 overflow-y-auto -mx-2 px-2 py-1 flex flex-col gap-1">
        {items.map((item) => {
          const s = STATUS[item.status];
          const selected = item.id === selectedId;
          const label = item.status === 'failed' && item.error ? item.error
            : item.status === 'done' && item.restoration === null ? 'Done, but not saved to your album'
              : s.label;
          return (
            <li key={item.id}
              className={`group relative flex items-center gap-2 rounded-md transition-colors
                ${selected ? 'bg-page outline outline-[1.5px] outline-brass' : 'hover:bg-page'}`}>
              <button type="button" onClick={() => onSelect(item.id)} aria-current={selected || undefined}
                className="flex flex-1 min-w-0 items-center gap-3.5 py-2.5 pl-3 pr-1 text-left rounded-md">
                <span className="mount mount-xs shrink-0 block w-11">
                  <img src={item.file.previewUrl} alt="" className="block w-11 h-11 object-cover" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] truncate">{item.file.name}</span>
                  <span className={`block text-sm truncate ${s.cls}`}>{label}</span>
                </span>
              </button>
              {item.status !== 'restoring' && !isRunning && (
                <button type="button" onClick={() => onRemove(item.id)} aria-label={`Remove ${item.file.name}`}
                  className="shrink-0 grid place-items-center w-8 h-8 mr-1.5 rounded-full text-bone-3 hover:text-rust hover:bg-panel">
                  <X className="w-4 h-4" />
                </button>
              )}
              {item.status === 'restoring' && (
                <span className="absolute inset-x-3 bottom-1 h-0.5 overflow-hidden rounded-full bg-rule" aria-hidden="true">
                  <span className="block h-full w-1/3 bg-brass animate-progress" />
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
};
