-- Create a dedicated schema for the application
CREATE SCHEMA IF NOT EXISTS "nanorewind-4k";

-- Create the profiles table
CREATE TABLE IF NOT EXISTS "nanorewind-4k".profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  credits INTEGER DEFAULT 3,
  last_refill TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Dummy
-- Enable RLS
ALTER TABLE "nanorewind-4k".profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can VIEW their own profile (Read-Only)
-- Dropping existing policies to be safe if re-running
DROP POLICY IF EXISTS "Users can view own profile" ON "nanorewind-4k".profiles;
CREATE POLICY "Users can view own profile" 
ON "nanorewind-4k".profiles 
FOR SELECT 
USING (auth.uid() = user_id);

-- Policy: Users can INSERT their own profile (for initial setup only)
DROP POLICY IF EXISTS "Users can insert own profile" ON "nanorewind-4k".profiles;
CREATE POLICY "Users can insert own profile" 
ON "nanorewind-4k".profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

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

-- 1. Grant usage on the custom schema to auth roles
GRANT USAGE ON SCHEMA "nanorewind-4k" TO anon, authenticated, service_role;

-- 2. Grant access to tables in the schema
GRANT ALL ON ALL TABLES IN SCHEMA "nanorewind-4k" TO anon, authenticated, service_role;

-- 3. Grant access to sequences (for ID generation)
GRANT ALL ON ALL SEQUENCES IN SCHEMA "nanorewind-4k" TO anon, authenticated, service_role;

-- 4. Ensure future tables also get these permissions
ALTER DEFAULT PRIVILEGES IN SCHEMA "nanorewind-4k" GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA "nanorewind-4k" GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;

-- 5. Explicitly Grant Execute on the RPC function used for credits
GRANT EXECUTE ON FUNCTION "nanorewind-4k".deduct_credits() TO anon, authenticated, service_role;

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
