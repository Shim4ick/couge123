-- Add reply_to column to messages table
ALTER TABLE messages
ADD COLUMN reply_to BIGINT REFERENCES messages(id);

-- Add updated_at column to messages table
ALTER TABLE messages
ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE;

-- Create a trigger to automatically update the updated_at column
CREATE OR REPLACE FUNCTION update_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_messages_updated_at
BEFORE UPDATE ON messages
FOR EACH ROW
EXECUTE FUNCTION update_messages_updated_at();

-- Update existing messages to set updated_at to created_at
UPDATE messages
SET updated_at = created_at
WHERE updated_at IS NULL;

-- Add an index to improve query performance for replies
CREATE INDEX idx_messages_reply_to ON messages(reply_to);

-- Update RLS policies to allow users to update their own messages
CREATE POLICY "Users can update their own messages"
ON messages FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Ensure RLS is enabled for the messages table
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
