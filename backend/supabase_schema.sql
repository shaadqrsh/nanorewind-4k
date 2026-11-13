-- Create a dedicated schema for the application
CREATE SCHEMA IF NOT EXISTS "nanorewind-4k";

-- Create the profiles table
CREATE TABLE IF NOT EXISTS "nanorewind-4k".profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  credits INTEGER DEFAULT 3,
  last_refill TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS
ALTER TABLE "nanorewind-4k".profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can VIEW their own profile (Read-Only)
-- Dropping existing policies to be safe if re-running
DROP POLICY IF EXISTS "Users can view own profile" ON "nanorewind-4k".profiles;
CREATE POLICY "Users can view own profile" 
ON "nanorewind-4k".profiles 
FOR SELECT 
USING ((SELECT auth.uid()) = user_id);

-- Policy: Users can INSERT their own profile (for initial setup only)
DROP POLICY IF EXISTS "Users can insert own profile" ON "nanorewind-4k".profiles;
CREATE POLICY "Users can insert own profile" 
ON "nanorewind-4k".profiles 
FOR INSERT 
WITH CHECK ((SELECT auth.uid()) = user_id);

-- CRITICAL: NO UPDATE POLICY for users.
-- This ensures users cannot modify their credits directly via API.

-- Function: Securely deduct credits
-- This runs with elevated privileges (SECURITY DEFINER) but is accessible to users
CREATE OR REPLACE FUNCTION "nanorewind-4k".deduct_credits()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = "nanorewind-4k", public
AS $$
DECLARE
  v_user_id UUID;
  v_credits INT;
  v_last_refill TIMESTAMPTZ;
  v_max_credits INT := 3;
  v_refill_ms BIGINT := 86400000; -- 24 hours in ms
  v_now TIMESTAMPTZ := NOW();
  v_elapsed_ms BIGINT;
  v_gained INT;
  v_current_total INT;
  v_new_last_refill TIMESTAMPTZ;
BEGIN
  -- Get user ID from the Auth context
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not authenticated');
  END IF;

  -- Lock the row for update to prevent race conditions
  SELECT credits, last_refill INTO v_credits, v_last_refill
  FROM "nanorewind-4k".profiles
  WHERE user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    -- Auto-create if missing (fallback)
    INSERT INTO "nanorewind-4k".profiles (user_id) VALUES (v_user_id)
    RETURNING credits, last_refill INTO v_credits, v_last_refill;
  END IF;

  -- Logic matching the Node.js implementation
  -- Postgres interval arithmetic
  v_elapsed_ms := EXTRACT(EPOCH FROM (v_now - v_last_refill)) * 1000;
  v_gained := FLOOR(v_elapsed_ms / v_refill_ms);
  v_current_total := LEAST(v_max_credits, v_credits + v_gained);

  IF v_current_total < 1 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Out of credits');
  END IF;

  -- Calculate new last_refill
  IF (v_credits + v_gained) >= v_max_credits THEN
     v_new_last_refill := v_now;
  ELSE
     -- Advance time by the full intervals gained
     v_new_last_refill := v_last_refill + (v_gained * INTERVAL '1 day');
  END IF;

  -- Deduct 1
  UPDATE "nanorewind-4k".profiles
  SET 
    credits = v_current_total - 1,
    last_refill = v_new_last_refill
  WHERE user_id = v_user_id;

  RETURN jsonb_build_object('success', true, 'remaining', v_current_total - 1);
END;
$$;

-- --- PLATE ARCHIVE: saved restorations ---

-- Each row points at two files in the private `nanorewind-plates` bucket (below).
-- Paths are stored rather than URLs: the bucket is private, so the API mints
-- short-lived signed URLs when it hands the archive to the owner.
CREATE TABLE IF NOT EXISTS "nanorewind-4k".restorations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid()
    REFERENCES "nanorewind-4k".profiles(user_id) ON DELETE CASCADE,
  original_path TEXT NOT NULL,
  restored_path TEXT NOT NULL,
  original_name TEXT,
  process TEXT NOT NULL DEFAULT 'standard',
  chiaroscuro BOOLEAN NOT NULL DEFAULT false,
  matte BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS restorations_user_created_idx
  ON "nanorewind-4k".restorations (user_id, created_at DESC);

ALTER TABLE "nanorewind-4k".restorations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own restorations" ON "nanorewind-4k".restorations;
CREATE POLICY "Users can view own restorations"
ON "nanorewind-4k".restorations
FOR SELECT
USING ((SELECT auth.uid()) = user_id);

-- A row may only reference files inside the caller's own storage folder.
DROP POLICY IF EXISTS "Users can insert own restorations" ON "nanorewind-4k".restorations;
CREATE POLICY "Users can insert own restorations"
ON "nanorewind-4k".restorations
FOR INSERT
WITH CHECK (
  (SELECT auth.uid()) = user_id
  AND split_part(original_path, '/', 1) = (SELECT auth.uid())::text
  AND split_part(restored_path, '/', 1) = (SELECT auth.uid())::text
);

DROP POLICY IF EXISTS "Users can delete own restorations" ON "nanorewind-4k".restorations;
CREATE POLICY "Users can delete own restorations"
ON "nanorewind-4k".restorations
FOR DELETE
USING ((SELECT auth.uid()) = user_id);

-- No UPDATE policy: archive entries are immutable.

-- --- PERMISSIONS ---

-- Least privilege. Every table is reached with the signed-in user's token
-- (role "authenticated"), and RLS then limits rows to their own. "anon" (no
-- token) needs no table access at all. Re-running this file on an existing
-- project first revokes the broad grants older versions handed out.

GRANT USAGE ON SCHEMA "nanorewind-4k" TO anon, authenticated, service_role;

REVOKE ALL ON ALL TABLES IN SCHEMA "nanorewind-4k" FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA "nanorewind-4k" FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA "nanorewind-4k" REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA "nanorewind-4k" REVOKE ALL ON SEQUENCES FROM anon, authenticated;

-- profiles: read your own row; create it once, and only the user_id column, so
-- credits and last_refill always start at their defaults. No UPDATE or DELETE.
GRANT SELECT ON "nanorewind-4k".profiles TO authenticated;
GRANT INSERT (user_id) ON "nanorewind-4k".profiles TO authenticated;

-- restorations: read, add and delete your own entries (enforced by RLS).
GRANT SELECT, INSERT, DELETE ON "nanorewind-4k".restorations TO authenticated;

GRANT ALL ON ALL TABLES IN SCHEMA "nanorewind-4k" TO service_role;

-- Credits can only change through this function, and only for the caller.
REVOKE ALL ON FUNCTION "nanorewind-4k".deduct_credits() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION "nanorewind-4k".deduct_credits() TO authenticated, service_role;

-- Keep-alive target for the hourly GitHub Action: touches the database without
-- exposing any table to anonymous callers.
CREATE OR REPLACE FUNCTION "nanorewind-4k".ping()
RETURNS TIMESTAMPTZ
LANGUAGE sql
STABLE
AS $$ SELECT now() $$;
REVOKE ALL ON FUNCTION "nanorewind-4k".ping() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION "nanorewind-4k".ping() TO anon, authenticated, service_role;

-- --- PLATE ARCHIVE: storage bucket ---

-- Private bucket. Files live at <user_id>/<restoration_id>/{original,restored}.<ext>,
-- and the policies below confine each user to their own <user_id>/ folder.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'nanorewind-plates',
  'nanorewind-plates',
  false,
  26214400, -- 25 MB
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "nanorewind: read own plates" ON storage.objects;
CREATE POLICY "nanorewind: read own plates"
ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'nanorewind-plates'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);

DROP POLICY IF EXISTS "nanorewind: upload own plates" ON storage.objects;
CREATE POLICY "nanorewind: upload own plates"
ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'nanorewind-plates'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);

DROP POLICY IF EXISTS "nanorewind: delete own plates" ON storage.objects;
CREATE POLICY "nanorewind: delete own plates"
ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'nanorewind-plates'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);

-- --- RATE LIMITING ---

-- Hit counters per (endpoint, hashed client IP) and fixed window. Only the
-- SECURITY DEFINER function below touches this table.
CREATE TABLE IF NOT EXISTS "nanorewind-4k".rate_limits (
  key TEXT NOT NULL,
  window_start TIMESTAMP WITH TIME ZONE NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (key, window_start)
);

-- RLS on with no policies, and the blanket grants above revoked: clients can't
-- read or reset their own counters.
ALTER TABLE "nanorewind-4k".rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "nanorewind-4k".rate_limits FROM anon, authenticated;

-- Records one hit and reports whether the caller is within the limit.
-- Uses a sliding-window estimate: the previous window's count, weighted by how
-- much of it still overlaps the sliding window, plus the current window's count.
-- This avoids the 2x burst a plain fixed window allows at each boundary.
CREATE OR REPLACE FUNCTION "nanorewind-4k".hit_rate_limit(
  p_key TEXT,
  p_limit INT,
  p_window_seconds INT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = "nanorewind-4k", public
AS $$
DECLARE
  v_now TIMESTAMPTZ := now();
  v_window INTERVAL;
  v_start TIMESTAMPTZ;
  v_current INT;
  v_previous INT;
  v_estimate NUMERIC;
BEGIN
  IF p_key IS NULL OR length(p_key) > 200 OR p_limit < 1 OR p_window_seconds < 1 THEN
    RAISE EXCEPTION 'invalid rate limit arguments';
  END IF;

  v_window := make_interval(secs => p_window_seconds);
  v_start := to_timestamp(floor(extract(epoch FROM v_now) / p_window_seconds) * p_window_seconds);

  INSERT INTO rate_limits (key, window_start, request_count)
  VALUES (p_key, v_start, 1)
  ON CONFLICT (key, window_start)
  DO UPDATE SET request_count = rate_limits.request_count + 1
  RETURNING request_count INTO v_current;

  SELECT request_count INTO v_previous
  FROM rate_limits
  WHERE key = p_key AND window_start = v_start - v_window;

  v_estimate := COALESCE(v_previous, 0)
    * (1 - extract(epoch FROM (v_now - v_start)) / p_window_seconds)
    + v_current;

  -- Occasional cleanup so the table doesn't grow forever.
  IF random() < 0.01 THEN
    DELETE FROM rate_limits WHERE window_start < v_now - INTERVAL '2 days';
  END IF;

  RETURN jsonb_build_object(
    'allowed', v_estimate <= p_limit,
    'remaining', GREATEST(0, floor(p_limit - v_estimate))::INT,
    'reset', extract(epoch FROM v_start + v_window)::BIGINT
  );
END;
$$;

-- The API calls this with the anon key, including before sign-in (signup, login).
REVOKE ALL ON FUNCTION "nanorewind-4k".hit_rate_limit(TEXT, INT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION "nanorewind-4k".hit_rate_limit(TEXT, INT, INT) TO anon, authenticated, service_role;

-- --- SHARE LINKS ---

-- A restoration is public only while it has a share_id: a random, unguessable
-- string the API generates. Stopping sharing sets it back to NULL, so old links
-- stop working, and sharing again creates a new link.
ALTER TABLE "nanorewind-4k".restorations ADD COLUMN IF NOT EXISTS share_id TEXT;
ALTER TABLE "nanorewind-4k".restorations ADD COLUMN IF NOT EXISTS shared_at TIMESTAMP WITH TIME ZONE;

CREATE UNIQUE INDEX IF NOT EXISTS restorations_share_id_idx
  ON "nanorewind-4k".restorations (share_id) WHERE share_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS restorations_shared_original_idx
  ON "nanorewind-4k".restorations (original_path) WHERE share_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS restorations_shared_restored_idx
  ON "nanorewind-4k".restorations (restored_path) WHERE share_id IS NOT NULL;

-- Start or stop sharing one of your own restorations. Rows have no UPDATE
-- grant, so this is the only way share_id can change.
CREATE OR REPLACE FUNCTION "nanorewind-4k".set_restoration_share(p_id UUID, p_share_id TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = "nanorewind-4k", public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '28000';
  END IF;
  IF p_share_id IS NOT NULL AND p_share_id !~ '^[A-Za-z0-9_-]{16,64}$' THEN
    RAISE EXCEPTION 'invalid share id' USING ERRCODE = '22023';
  END IF;

  UPDATE restorations
  SET share_id = p_share_id,
      shared_at = CASE WHEN p_share_id IS NULL THEN NULL ELSE now() END
  WHERE id = p_id AND user_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'restoration not found' USING ERRCODE = 'P0002';
  END IF;
  RETURN p_share_id;
END;
$$;
REVOKE ALL ON FUNCTION "nanorewind-4k".set_restoration_share(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION "nanorewind-4k".set_restoration_share(UUID, TEXT) TO authenticated, service_role;

-- What a public share page may know: the two images and the style. Not the
-- owner, and not the original filename (it can contain people's names).
CREATE OR REPLACE FUNCTION "nanorewind-4k".get_shared_restoration(p_share_id TEXT)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = "nanorewind-4k", public
AS $$
  SELECT jsonb_build_object(
    'original_path', original_path,
    'restored_path', restored_path,
    'process', process,
    'chiaroscuro', chiaroscuro,
    'matte', matte,
    'created_at', created_at
  )
  FROM restorations
  WHERE p_share_id IS NOT NULL AND share_id = p_share_id;
$$;
REVOKE ALL ON FUNCTION "nanorewind-4k".get_shared_restoration(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION "nanorewind-4k".get_shared_restoration(TEXT) TO anon, authenticated, service_role;

-- Used by the storage rule below: is this file part of a shared restoration?
CREATE OR REPLACE FUNCTION "nanorewind-4k".is_shared_plate(p_name TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = "nanorewind-4k", public
COST 1000 -- tells the planner to check the cheap bucket_id condition first
AS $$
  SELECT EXISTS (
    SELECT 1 FROM restorations
    WHERE share_id IS NOT NULL AND (original_path = p_name OR restored_path = p_name)
  );
$$;
REVOKE ALL ON FUNCTION "nanorewind-4k".is_shared_plate(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION "nanorewind-4k".is_shared_plate(TEXT) TO anon, service_role;

-- Anonymous visitors (via the share page's API) may read files of shared
-- restorations, and nothing else. Limited to the anon role, so it doesn't
-- touch queries made by signed-in users of this or the other app.
DROP POLICY IF EXISTS "nanorewind: read shared plates" ON storage.objects;
CREATE POLICY "nanorewind: read shared plates"
ON storage.objects
FOR SELECT TO anon
USING (
  bucket_id = 'nanorewind-plates'
  AND "nanorewind-4k".is_shared_plate(name)
);

-- Make the API see new tables immediately (avoids PGRST205 "not in the schema cache").
NOTIFY pgrst, 'reload schema';
