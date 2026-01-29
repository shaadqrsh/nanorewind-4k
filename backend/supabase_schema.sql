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
