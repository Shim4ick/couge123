-- Create user_status table for tracking online presence
CREATE TABLE IF NOT EXISTS user_status (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  online BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT DEFAULT 'offline', -- online, idle, dnd, offline
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create RLS policies for user_status table
ALTER TABLE user_status ENABLE ROW LEVEL SECURITY;

-- Allow users to read any user's status
CREATE POLICY "Anyone can read user status"
  ON user_status
  FOR SELECT
  USING (true);

-- Allow users to update only their own status
CREATE POLICY "Users can update their own status"
  ON user_status
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Allow users to insert only their own status
CREATE POLICY "Users can insert their own status"
  ON user_status
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create function to automatically update the updated_at column
CREATE OR REPLACE FUNCTION update_user_status_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to call the function before update
CREATE TRIGGER update_user_status_updated_at
BEFORE UPDATE ON user_status
FOR EACH ROW
EXECUTE FUNCTION update_user_status_updated_at();
