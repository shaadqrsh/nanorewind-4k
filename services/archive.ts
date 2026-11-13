// API runs as same-origin Vercel serverless functions under /api.
import { Restoration } from '../types';
import { authService } from './auth';
import { expectJson } from './http';

const authHeader = () => {
  const token = authService.getToken();
  if (!token) throw new Error('Not signed in');
  return { Authorization: `Bearer ${token}` };
};

export interface ArchivePage {
  restorations: Restoration[];
  hasMore: boolean;
}

export const archiveService = {
  // `before` is the createdAt of the oldest item already loaded, passed verbatim.
  list: async (before?: string): Promise<ArchivePage> => {
    const query = before ? `?before=${encodeURIComponent(before)}` : '';
    const res = await fetch(`/api/restorations${query}`, { headers: authHeader() });
    return expectJson<ArchivePage>(res, 'Could not load your archive');
  },

  remove: async (id: string): Promise<void> => {
    const res = await fetch(`/api/restorations?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: authHeader(),
    });
    await expectJson(res, 'Could not delete this restoration');
  },
};
