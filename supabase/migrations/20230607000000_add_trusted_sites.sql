-- Create trusted_sites table
CREATE TABLE trusted_sites (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  domain VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(user_id, domain)
);

-- Add RLS policies for trusted_sites table
ALTER TABLE trusted_sites ENABLE ROW LEVEL SECURITY;

-- Allow users to insert their own trusted sites
CREATE POLICY "Users can insert their own trusted sites"
ON trusted_sites FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Allow users to view their own trusted sites
CREATE POLICY "Users can view their own trusted sites"
ON trusted_sites FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Allow users to delete their own trusted sites
CREATE POLICY "Users can delete their own trusted sites"
ON trusted_sites FOR DELETE TO authenticated
USING (auth.uid() = user_id);
