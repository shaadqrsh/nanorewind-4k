-- Run this in your Supabase SQL Editor

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
