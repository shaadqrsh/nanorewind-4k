import { randomUUID } from 'node:crypto';
import { makeScopedClient } from './supabase.js';

type ScopedClient = ReturnType<typeof makeScopedClient>;

// Private bucket; see backend/supabase_schema.sql for its RLS policies.
export const PLATES_BUCKET = 'nanorewind-plates';

// Signed URLs only ever go to the owner. Six hours keeps an open tab working
// without re-signing every time the archive is opened.
const SIGNED_URL_TTL_S = 6 * 60 * 60;

export const RESTORATION_COLUMNS =
  'id, created_at, original_path, restored_path, original_name, process, chiaroscuro, matte, share_id';

export interface RestorationRow {
  id: string;
  created_at: string;
  original_path: string;
  restored_path: string;
  original_name: string | null;
  process: string;
  chiaroscuro: boolean;
  matte: boolean;
  share_id: string | null;
}

// The client-facing shape: storage paths swapped for signed URLs.
export interface RestorationDTO {
  id: string;
  createdAt: string;
  originalName: string | null;
  process: string;
  chiaroscuro: boolean;
  matte: boolean;
  originalUrl: string | null;
  restoredUrl: string | null;
  shareId: string | null; // set while the restoration has a public link
}

const EXTENSIONS: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

export async function signRestorations(
  supabase: ScopedClient,
  rows: RestorationRow[],
): Promise<RestorationDTO[]> {
  if (rows.length === 0) return [];

  const paths = rows.flatMap((r) => [r.original_path, r.restored_path]);
  const { data, error } = await supabase.storage
    .from(PLATES_BUCKET)
    .createSignedUrls(paths, SIGNED_URL_TTL_S);
  if (error) throw error;

  const urlByPath = new Map(data.map((d) => [d.path, d.signedUrl]));
  return rows.map((r) => ({
    id: r.id,
    // Passed back verbatim as the pagination cursor, so keep Postgres's
    // microsecond precision rather than round-tripping through Date.
    createdAt: r.created_at,
    originalName: r.original_name,
    process: r.process,
    chiaroscuro: r.chiaroscuro,
    matte: r.matte,
    originalUrl: urlByPath.get(r.original_path) ?? null,
    restoredUrl: urlByPath.get(r.restored_path) ?? null,
    shareId: r.share_id ?? null,
  }));
}

export interface ArchiveInput {
  original: { base64: string; mimeType: string; name: string | null };
  restored: { base64: string; mimeType: string };
  treatment: { process: string; chiaroscuro: boolean; matte: boolean };
}

// Uploads both images to the caller's folder and records the restoration.
// If anything before the insert fails, the uploaded files are cleaned up.
export async function archiveRestoration(
  supabase: ScopedClient,
  userId: string,
  input: ArchiveInput,
): Promise<RestorationDTO> {
  const id = randomUUID();
  const folder = `${userId}/${id}`;
  const originalPath = `${folder}/original.${EXTENSIONS[input.original.mimeType] ?? 'img'}`;
  const restoredPath = `${folder}/restored.${EXTENSIONS[input.restored.mimeType] ?? 'img'}`;
  const bucket = supabase.storage.from(PLATES_BUCKET);

  let row: RestorationRow;
  try {
    const uploads = await Promise.all([
      bucket.upload(originalPath, Buffer.from(input.original.base64, 'base64'), {
        contentType: input.original.mimeType,
      }),
      bucket.upload(restoredPath, Buffer.from(input.restored.base64, 'base64'), {
        contentType: input.restored.mimeType,
      }),
    ]);
    const uploadError = uploads.find((u) => u.error)?.error;
    if (uploadError) throw uploadError;

    const { data, error } = await supabase
      .from('restorations')
      .insert({
        id,
        user_id: userId,
        original_path: originalPath,
        restored_path: restoredPath,
        original_name: input.original.name,
        ...input.treatment,
      })
      .select(RESTORATION_COLUMNS)
      .single();
    if (error) throw error;
    row = data as RestorationRow;
  } catch (err) {
    await bucket.remove([originalPath, restoredPath]).catch(() => {});
    throw err;
  }

  const [dto] = await signRestorations(supabase, [row]);
  return dto;
}
