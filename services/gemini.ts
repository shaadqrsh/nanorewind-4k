// API runs as same-origin Vercel serverless functions under /api.
import { Restoration } from '../types';
import { expectJson } from './http';

export interface RestoreResult {
  image: string;                     // data URL of the restored image
  restoration: Restoration | null;   // archive entry, or null if saving it failed
}

export const restoreImage = async (
  base64Image: string,
  mimeType: string,
  originalName: string,
  options: { process: string; chiaroscuro: boolean; matte: boolean },
): Promise<RestoreResult> => {
  // The session cookie authenticates this request. Errors (out of credits,
  // rate limited, ...) are shown in the UI, so they aren't logged here.
  const response = await fetch(`/api/restore`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      image: base64Image,
      mimeType: mimeType,
      originalName,
      process: options.process,
      chiaroscuro: options.chiaroscuro,
      matte: options.matte
    })
  });

  const data = await expectJson(response, 'Restoration failed');
  return { image: data.image, restoration: data.restoration ?? null };
};
