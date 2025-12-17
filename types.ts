export interface ImageFile {
  file: File;
  previewUrl: string;
}

export type RestorationStatus = 'idle' | 'loading' | 'success' | 'error';
