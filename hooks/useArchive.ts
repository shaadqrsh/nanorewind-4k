import { useCallback, useEffect, useRef, useState } from 'react';
import { Restoration } from '../types';
import { archiveService } from '../services/archive';

type ArchiveStatus = 'idle' | 'loading' | 'ready' | 'error';

// The server signs URLs for 6h. Refetch a little before that so thumbnails
// never point at expired links.
const STALE_AFTER_MS = 5 * 60 * 60 * 1000;

export interface ArchiveState {
  items: Restoration[];
  status: ArchiveStatus;
  error: string | null;
  hasMore: boolean;
  isLoadingMore: boolean;
  ensureFresh: () => void;
  reload: () => void;
  loadMore: () => void;
  add: (r: Restoration) => void;
  remove: (id: string) => Promise<void>;
  setShared: (id: string, shared: boolean) => Promise<string | null>;
  reset: () => void;
}

const message = (err: unknown, fallback: string) => (err instanceof Error && err.message) || fallback;

export function useArchive(): ArchiveState {
  const [items, setItems] = useState<Restoration[]>([]);
  const [status, setStatus] = useState<ArchiveStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const fetchedAt = useRef(0);

  const reload = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const page = await archiveService.list();
      setItems(page.restorations);
      setHasMore(page.hasMore);
      fetchedAt.current = Date.now();
      setStatus('ready');
    } catch (err) {
      setError(message(err, 'Your album could not be loaded'));
      setStatus('error');
    }
  }, []);

  // Called whenever the archive opens: fetch the first time, then only when
  // the signed URLs are close to expiring.
  const ensureFresh = useCallback(() => {
    if (status === 'loading') return;
    if (status !== 'ready' || Date.now() - fetchedAt.current > STALE_AFTER_MS) reload();
  }, [status, reload]);

  const loadMore = useCallback(async () => {
    const oldest = items[items.length - 1];
    if (!oldest || isLoadingMore) return;
    setIsLoadingMore(true);
    setError(null);
    try {
      const page = await archiveService.list(oldest.createdAt);
      setItems(prev => [...prev, ...page.restorations]);
      setHasMore(page.hasMore);
    } catch (err) {
      setError(message(err, 'Older photos could not be loaded. Try again.'));
    } finally {
      setIsLoadingMore(false);
    }
  }, [items, isLoadingMore]);

  const add = useCallback((r: Restoration) => {
    setItems(prev => [r, ...prev.filter(p => p.id !== r.id)]);
  }, []);

  const remove = useCallback(async (id: string) => {
    await archiveService.remove(id);
    setItems(prev => prev.filter(p => p.id !== id));
  }, []);

  const setShared = useCallback(async (id: string, shared: boolean) => {
    const shareId = await archiveService.setShared(id, shared);
    setItems(prev => prev.map(p => (p.id === id ? { ...p, shareId } : p)));
    return shareId;
  }, []);

  // Deleting every loaded item leaves no cursor for "Load older", so refetch
  // the newest page instead.
  useEffect(() => {
    if (status === 'ready' && items.length === 0 && hasMore) reload();
  }, [status, items.length, hasMore, reload]);

  const reset = useCallback(() => {
    setItems([]);
    setStatus('idle');
    setError(null);
    setHasMore(false);
    fetchedAt.current = 0;
  }, []);

  return { items, status, error, hasMore, isLoadingMore, ensureFresh, reload, loadMore, add, remove, setShared, reset };
}
