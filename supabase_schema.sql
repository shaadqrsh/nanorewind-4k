-- Create a dedicated schema for the application to isolate it from other apps in the same project
CREATE SCHEMA IF NOT EXISTS "nanorewind-4k";

-- Create the profiles table (formerly users)
CREATE TABLE IF NOT EXISTS "nanorewind-4k".profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  credits INTEGER DEFAULT 3,
  last_refill TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS (Row Level Security) - best practice even if we only use service role
ALTER TABLE "nanorewind-4k".profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own profile
CREATE POLICY "Users can view own profile" 
ON "nanorewind-4k".profiles 
FOR SELECT 
USING (auth.uid() = user_id);

-- Policy: Service role has full access (implicit, but good to know)
-- No specific policy needed for service role as it bypasses RLS.

-- Optional: Function to auto-create profile on signup
-- Note: You can run this if you want auto-creation, otherwise the backend handles it lazily.
/*
create or replace function "nanorewind-4k".handle_new_user() 
returns trigger as $$
begin
  insert into "nanorewind-4k".profiles (user_id)
  values (new.id);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure "nanorewind-4k".handle_new_user();
*/
