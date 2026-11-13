// The photo in the workspace: a fresh upload (data URL) or an archived plate (signed URL).
export interface ImageFile {
  previewUrl: string;
  name: string;
  mimeType: string;
}

export type RestorationStatus = 'idle' | 'loading' | 'success' | 'error';

export interface User {
  email: string;
  name?: string;
  id?: string;
}

// A saved restoration from the archive. URLs are short-lived signed links,
// or null if a stored file has gone missing.
export interface Restoration {
  id: string;
  createdAt: string;
  originalName: string | null;
  process: string;
  chiaroscuro: boolean;
  matte: boolean;
  originalUrl: string | null;
  restoredUrl: string | null;
}
