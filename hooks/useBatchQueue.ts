import { useCallback, useRef, useState } from 'react';
import { ImageFile, Restoration } from '../types';
import { ApiError } from '../services/http';
import type { RestoreResult } from '../services/gemini';

export type QueueStatus = 'queued' | 'restoring' | 'done' | 'failed' | 'skipped';

export interface QueueItem {
  id: string;
  file: ImageFile;
  status: QueueStatus;
  error?: string;
  image?: string;                     // restored image (data URL)
  restoration?: Restoration | null;   // archive entry, null if saving failed
}

export interface BatchQueue {
  items: QueueItem[];
  isRunning: boolean;
  stopRequested: boolean;
  add: (files: ImageFile[]) => QueueItem[];
  remove: (id: string) => void;
  clear: () => void;
  run: (restore: (file: ImageFile) => Promise<RestoreResult>, onFinished?: (item: QueueItem) => void) => Promise<void>;
  stop: () => void;
}

let nextId = 0;

// Restores photos one at a time, in order. Each photo costs one credit; when
// credits run out, the rest are marked "skipped" so they can be retried later.
export function useBatchQueue(): BatchQueue {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [stopRequested, setStopRequested] = useState(false);
  const itemsRef = useRef<QueueItem[]>([]);
  const stopRef = useRef(false);

  const commit = (next: QueueItem[]) => {
    itemsRef.current = next;
    setItems(next);
  };
  const update = (id: string, patch: Partial<QueueItem>) =>
    commit(itemsRef.current.map(i => (i.id === id ? { ...i, ...patch } : i)));

  const add = useCallback((files: ImageFile[]) => {
    const added = files.map(file => ({ id: `q${++nextId}`, file, status: 'queued' as const }));
    commit([...itemsRef.current, ...added]);
    return added;
  }, []);

  const remove = useCallback((id: string) => {
    commit(itemsRef.current.filter(i => i.id !== id || i.status === 'restoring'));
  }, []);

  const clear = useCallback(() => commit([]), []);

  const stop = useCallback(() => {
    stopRef.current = true;
    setStopRequested(true);
  }, []);

  const run = useCallback(async (
    restore: (file: ImageFile) => Promise<RestoreResult>,
    onFinished?: (item: QueueItem) => void,
  ) => {
    stopRef.current = false;
    setStopRequested(false);
    setIsRunning(true);
    // Skipped photos (no credits last time) get another go.
    commit(itemsRef.current.map(i => (i.status === 'skipped' ? { ...i, status: 'queued', error: undefined } : i)));

    try {
      for (;;) {
        const item = itemsRef.current.find(i => i.status === 'queued');
        if (!item || stopRef.current) break;

        update(item.id, { status: 'restoring', error: undefined });
        try {
          const { image, restoration } = await restore(item.file);
          update(item.id, { status: 'done', image, restoration });
        } catch (err) {
          const status = err instanceof ApiError ? err.status : 0;
          const message = (err as Error).message || 'Restoration failed.';
          if (status === 402) {
            // Out of credits: this one and everything after it waits.
            commit(itemsRef.current.map(i =>
              i.id === item.id || i.status === 'queued' ? { ...i, status: 'skipped', error: 'No credits left' } : i));
            break;
          }
          update(item.id, { status: 'failed', error: message });
          if (status === 429 || status === 401) break; // rate limited or signed out: pause the batch
        } finally {
          const finished = itemsRef.current.find(i => i.id === item.id);
          if (finished) onFinished?.(finished);
        }
      }
    } finally {
      setIsRunning(false);
      setStopRequested(false);
    }
  }, []);

  return { items, isRunning, stopRequested, add, remove, clear, run, stop };
}
