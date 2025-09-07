-- Add channel_type column to channels table
ALTER TABLE channels ADD COLUMN channel_type VARCHAR(10) DEFAULT 'text' CHECK (channel_type IN ('text', 'voice'));

-- Create voice_sessions table for tracking voice channel participants
CREATE TABLE voice_sessions (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    channel_id BIGINT REFERENCES channels(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_muted BOOLEAN DEFAULT FALSE,
    is_deafened BOOLEAN DEFAULT FALSE,
    is_speaking BOOLEAN DEFAULT FALSE,
    UNIQUE(user_id, channel_id)
);

-- Enable RLS on voice_sessions
ALTER TABLE voice_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies for voice_sessions
CREATE POLICY "Users can view voice sessions in their servers" ON voice_sessions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM channels c
            JOIN server_members sm ON c.server_id = sm.server_id
            WHERE c.id = voice_sessions.channel_id
            AND sm.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own voice sessions" ON voice_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own voice sessions" ON voice_sessions
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own voice sessions" ON voice_sessions
    FOR DELETE USING (auth.uid() = user_id);

-- Create function to clean up old voice sessions
CREATE OR REPLACE FUNCTION cleanup_voice_sessions()
RETURNS void AS $$
BEGIN
    DELETE FROM voice_sessions 
    WHERE joined_at < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;
