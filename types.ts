export interface ImageFile {
  file: File;
  previewUrl: string;
}

export type RestorationStatus = 'idle' | 'loading' | 'success' | 'error';

export interface User {
  email: string;
  name?: string;
  id?: string;
}