import { randomBytes } from 'node:crypto';
import type { VercelRequest, VercelResponse } from './_lib/vercel.js';
import { requireUser, AuthedContext } from './_lib/auth.js';
import {
  PLATES_BUCKET,
  RESTORATION_COLUMNS,
  RestorationRow,
  signRestorations,
} from './_lib/archive.js';

// GET    /api/restorations[?before=<createdAt>]  → newest-first page of the caller's archive
// PATCH  /api/restorations?id=<uuid>  { shared }  → start or stop a public share link
// DELETE /api/restorations?id=<uuid>              → remove one restoration and its files
// DELETE /api/restorations?all=1                  → remove every restoration the caller has
//
// One function serves all methods to stay inside Vercel Hobby's 12-function limit.

const PAGE_SIZE = 48;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'PATCH' && req.method !== 'DELETE') {
    res.setHeader('Allow', 'GET, PATCH, DELETE');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ctx = await requireUser(req, res);
  if (!ctx) return;

  try {
    if (req.method === 'GET') return await list(ctx, req, res);
    if (req.method === 'PATCH') return await setShared(ctx, req, res);
    if (req.query.all === '1') return await removeAll(ctx, res);
    return await remove(ctx, req, res);
  } catch (err) {
    console.error(`Restorations ${req.method} error:`, err);
    res.status(500).json({
      error: isMissingSetup(err)
        ? 'Archive is not set up yet: run backend/supabase_schema.sql in Supabase'
        : 'Archive request failed',
    });
  }
}

// Missing table (PostgREST PGRST205 / Postgres 42P01) or missing storage bucket.
const isMissingSetup = (err: unknown): boolean => {
  const e = err as { code?: string; message?: string };
  return e?.code === 'PGRST205' || e?.code === '42P01' || /bucket not found/i.test(e?.message ?? '');
};

async function list(ctx: AuthedContext, req: VercelRequest, res: VercelResponse) {
  const { before } = req.query;

  // Fetch one extra row to learn whether an older page exists.
  let query = ctx.supabase
    .from('restorations')
    .select(RESTORATION_COLUMNS)
    .eq('user_id', ctx.user.id)
    .order('created_at', { ascending: false })
    .limit(PAGE_SIZE + 1);

  if (typeof before === 'string') {
    if (Number.isNaN(Date.parse(before))) return res.status(400).json({ error: 'Invalid cursor' });
    query = query.lt('created_at', before);
  }

  const { data, error } = await query;
  if (error) throw error;

  const rows = (data ?? []) as RestorationRow[];
  const restorations = await signRestorations(ctx.supabase, rows.slice(0, PAGE_SIZE));

  res.setHeader('Cache-Control', 'private, no-store');
  res.json({ restorations, hasMore: rows.length > PAGE_SIZE });
}

async function remove(ctx: AuthedContext, req: VercelRequest, res: VercelResponse) {
  const { id } = req.query;
  if (typeof id !== 'string' || !UUID_RE.test(id)) {
    return res.status(400).json({ error: 'Invalid restoration id' });
  }

  const { data: row, error: fetchError } = await ctx.supabase
    .from('restorations')
    .select('original_path, restored_path')
    .eq('id', id)
    .maybeSingle();
  if (fetchError) throw fetchError;
  if (!row) return res.status(404).json({ error: 'Restoration not found' });

  // Files go first. If that fails, nothing has changed and the client can retry.
  // A retry after a later failure is still safe: removing missing files is a no-op.
  const { error: storageError } = await ctx.supabase.storage
    .from(PLATES_BUCKET)
    .remove([row.original_path, row.restored_path]);
  if (storageError) throw storageError;

  const { error: deleteError } = await ctx.supabase.from('restorations').delete().eq('id', id);
  if (deleteError) throw deleteError;

  res.json({ success: true });
}

// "Delete all my photos" in Settings. Works through the archive in batches:
// files first, then their rows, so a failure part-way leaves nothing pointing
// at missing files, and running it again carries on where it stopped. A last
// sweep removes any files in the caller's folder that no row points at.
const DELETE_BATCH = 100;

async function removeAll(ctx: AuthedContext, res: VercelResponse) {
  const bucket = ctx.supabase.storage.from(PLATES_BUCKET);
  let deleted = 0;

  for (;;) {
    const { data, error } = await ctx.supabase
      .from('restorations')
      .select('id, original_path, restored_path')
      .eq('user_id', ctx.user.id)
      .limit(DELETE_BATCH);
    if (error) throw error;
    const rows = data ?? [];
    if (rows.length === 0) break;

    const { error: storageError } = await bucket.remove(rows.flatMap((r) => [r.original_path, r.restored_path]));
    if (storageError) throw storageError;
    const { error: deleteError } = await ctx.supabase.from('restorations').delete().in('id', rows.map((r) => r.id));
    if (deleteError) throw deleteError;

    deleted += rows.length;
    if (rows.length < DELETE_BATCH) break;
  }

  // Leftover files: <user_id>/<restoration_id>/<file>. Bounded, so one call
  // can't run forever; the leftovers are normally none at all.
  const { data: folders } = await bucket.list(ctx.user.id, { limit: 100 });
  for (const folder of folders ?? []) {
    const prefix = `${ctx.user.id}/${folder.name}`;
    const { data: files } = await bucket.list(prefix, { limit: 100 });
    const paths = (files ?? []).map((f) => `${prefix}/${f.name}`);
    if (paths.length > 0) await bucket.remove(paths);
  }

  res.json({ deleted });
}

// Share links are 16 random URL-safe characters (96 bits), made here rather
// than in the database. Sharing again always makes a new link.
async function setShared(ctx: AuthedContext, req: VercelRequest, res: VercelResponse) {
  const { id } = req.query;
  if (typeof id !== 'string' || !UUID_RE.test(id)) {
    return res.status(400).json({ error: 'Invalid restoration id' });
  }
  const shared = req.body?.shared;
  if (typeof shared !== 'boolean') return res.status(400).json({ error: 'Expected { shared: true | false }' });

  const shareId = shared ? randomBytes(12).toString('base64url') : null;
  const { error } = await ctx.supabase.rpc('set_restoration_share', { p_id: id, p_share_id: shareId });
  if (error) {
    if (error.code === 'P0002') return res.status(404).json({ error: 'Restoration not found' });
    throw error;
  }
  res.json({ shareId });
}
