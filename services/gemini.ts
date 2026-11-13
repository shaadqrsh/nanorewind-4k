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
  token: string
): Promise<RestoreResult> => {
  try {
    const response = await fetch(`/api/restore`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
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
  } catch (error) {
    console.error("Restoration Error:", error);
    throw error;
  }
};
