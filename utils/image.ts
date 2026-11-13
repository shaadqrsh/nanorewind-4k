// Archived images are served from Supabase Storage, a different origin, where
// browsers ignore <a download>. Fetching into a same-origin blob URL makes
// downloads work for remote URLs and data URLs alike.

const fetchBlob = async (url: string): Promise<Blob> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('This image link has expired. Reopen the archive and try again.');
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
