-- Drop the existing typing_status table if it exists
DROP TABLE IF EXISTS typing_status;

-- Create typing_status table with a unique constraint
CREATE TABLE typing_status (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  channel_id BIGINT REFERENCES channels(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  is_typing BOOLEAN NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(user_id, channel_id)
);

-- Add RLS policies
ALTER TABLE typing_status ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert and update their own typing status
CREATE POLICY "Users can insert their own typing status"
ON typing_status FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own typing status"
ON typing_status FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

-- Allow all authenticated users to read typing status
CREATE POLICY "Authenticated users can read typing status"
ON typing_status FOR SELECT TO authenticated
USING (true);

-- Create an index for faster querying
CREATE INDEX idx_typing_status_channel_id ON typing_status(channel_id);

-- Add a function to automatically update the updated_at column
CREATE OR REPLACE FUNCTION update_typing_status_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to call the function before each update
CREATE TRIGGER update_typing_status_updated_at
BEFORE UPDATE ON typing_status
FOR EACH ROW
EXECUTE FUNCTION update_typing_status_updated_at();
