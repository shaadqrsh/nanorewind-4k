import type { ImageFile } from '../types';

// Archived images are served from Supabase Storage, a different origin, where
// browsers ignore <a download>. Fetching into a same-origin blob URL makes
// downloads work for remote URLs and data URLs alike.

const fetchBlob = async (url: string): Promise<Blob> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('This image link has expired. Open your album again and retry.');
  return res.blob();
};

export const downloadImage = async (url: string, filename: string): Promise<void> => {
  const blob = await fetchBlob(url);
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
};

export type ShareOutcome = 'shared' | 'copied' | 'cancelled';

// Opens the native share sheet with the image file where supported (mostly
// mobile), otherwise copies the image to the clipboard.
export const shareImage = async (url: string, filename: string): Promise<ShareOutcome> => {
  const blob = await fetchBlob(url);
  const file = new File([blob], filename, { type: blob.type });

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Restored with NanoRewind' });
      return 'shared';
    } catch (err) {
      if ((err as DOMException).name === 'AbortError') return 'cancelled';
      throw err;
    }
  }

  if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write && blob.type === 'image/png') {
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    return 'copied';
  }

  throw new Error("Sharing isn't supported in this browser. Use Download instead.");
};

export const restoredFilename = (originalName: string | null): string => {
  const base = (originalName ?? '').replace(/\.[^./\\]+$/, '') || 'photo';
  return `${base}_restored.png`;
};

// --- Preparing uploads ---

// Vercel rejects request bodies over 4.5 MB, and base64 adds a third, so files
// above ~3 MB would fail. Larger photos are shrunk in the browser first. The
// restoration comes back at about 1K, so 3072px keeps plenty of detail.
const MAX_UPLOAD_BYTES = 3 * 1024 * 1024;
const MAX_SIDE_PX = 3072;
export const UPLOAD_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const readAsDataUrl = (file: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Could not read this file.'));
    reader.readAsDataURL(file);
  });

// The base64 body and type to send to /api/restore. A photo reopened from the
// album has a signed storage URL instead of a data URL, so fetch it first.
export const toUploadData = async (file: ImageFile): Promise<{ data: string; mimeType: string }> => {
  if (file.previewUrl.startsWith('data:')) {
    return { data: file.previewUrl.split(',')[1], mimeType: file.mimeType };
  }
  const blob = await fetchBlob(file.previewUrl);
  const dataUrl = await readAsDataUrl(blob);
  return { data: dataUrl.split(',')[1], mimeType: blob.type || file.mimeType || 'image/jpeg' };
};

const dataUrlBytes = (dataUrl: string) => Math.ceil(((dataUrl.length - dataUrl.indexOf(',') - 1) * 3) / 4);

export const prepareUpload = async (file: File): Promise<ImageFile> => {
  if (!UPLOAD_TYPES.includes(file.type)) throw new Error('Use a JPG, PNG or WebP photo.');
  if (file.size <= MAX_UPLOAD_BYTES) {
    return { previewUrl: await readAsDataUrl(file), name: file.name, mimeType: file.type };
  }

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE_PX / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  for (const quality of [0.9, 0.8, 0.7]) {
    const dataUrl = canvas.toDataURL('image/jpeg', quality);
    if (dataUrlBytes(dataUrl) <= MAX_UPLOAD_BYTES) {
      return { previewUrl: dataUrl, name: file.name, mimeType: 'image/jpeg' };
    }
  }
  throw new Error('This photo is too large to upload. Try a smaller copy.');
};
