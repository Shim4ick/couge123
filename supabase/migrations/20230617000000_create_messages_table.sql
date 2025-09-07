-- Create messages table
CREATE TABLE messages (
    id BIGSERIAL PRIMARY KEY,
    content TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    channel_id BIGINT NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    file_url TEXT
);

-- Add indexes for better query performance
CREATE INDEX idx_messages_user_id ON messages(user_id);
CREATE INDEX idx_messages_channel_id ON messages(channel_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);

-- Add a trigger to update the updated_at column
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_messages_modtime
BEFORE UPDATE ON messages
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();

-- Add Row Level Security (RLS) policies
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert messages
CREATE POLICY "Users can insert messages"
ON messages FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own messages
CREATE POLICY "Users can update own messages"
ON messages FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Allow users to delete their own messages
CREATE POLICY "Users can delete own messages"
ON messages FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Allow all authenticated users to read messages
CREATE POLICY "Authenticated users can read messages"
ON messages FOR SELECT
TO authenticated
USING (true);
