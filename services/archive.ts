// API runs as same-origin Vercel serverless functions under /api.
// The session cookie is sent automatically; no token handling needed here.
import { Restoration } from '../types';
import { expectJson } from './http';

export interface ArchivePage {
  restorations: Restoration[];
  hasMore: boolean;
}

export const archiveService = {
  // `before` is the createdAt of the oldest item already loaded, passed verbatim.
  list: async (before?: string): Promise<ArchivePage> => {
    const query = before ? `?before=${encodeURIComponent(before)}` : '';
    const res = await fetch(`/api/restorations${query}`);
    return expectJson<ArchivePage>(res, 'Could not load your archive');
  },

  remove: async (id: string): Promise<void> => {
    const res = await fetch(`/api/restorations?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    await expectJson(res, 'Could not delete this restoration');
  },
};
