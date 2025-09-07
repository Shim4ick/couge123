-- Create emoji_usage table for tracking frequently used emojis
CREATE TABLE IF NOT EXISTS emoji_usage (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    emoji_type VARCHAR(20) NOT NULL CHECK (emoji_type IN ('unicode', 'custom')),
    emoji_unicode TEXT, -- For unicode emojis
    emoji_id INTEGER, -- For custom emojis, references custom_emojis(id)
    server_id INTEGER REFERENCES servers(id) ON DELETE CASCADE,
    usage_count INTEGER DEFAULT 1,
    last_used_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure unique constraint for user + emoji combination
    UNIQUE(user_id, emoji_type, emoji_unicode, server_id),
    UNIQUE(user_id, emoji_type, emoji_id, server_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_emoji_usage_user_id ON emoji_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_emoji_usage_server_id ON emoji_usage(server_id);
CREATE INDEX IF NOT EXISTS idx_emoji_usage_last_used ON emoji_usage(last_used_at DESC);
CREATE INDEX IF NOT EXISTS idx_emoji_usage_count ON emoji_usage(usage_count DESC);

-- Enable RLS
ALTER TABLE emoji_usage ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own emoji usage" ON emoji_usage
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own emoji usage" ON emoji_usage
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own emoji usage" ON emoji_usage
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own emoji usage" ON emoji_usage
    FOR DELETE USING (auth.uid() = user_id);

-- Create function to handle upsert with increment
CREATE OR REPLACE FUNCTION upsert_emoji_usage(
    p_user_id UUID,
    p_emoji_type TEXT,
    p_emoji_unicode TEXT DEFAULT NULL,
    p_emoji_id INTEGER DEFAULT NULL,
    p_server_id INTEGER DEFAULT NULL
) RETURNS void AS $$
BEGIN
    INSERT INTO emoji_usage (user_id, emoji_type, emoji_unicode, emoji_id, server_id, usage_count, last_used_at)
    VALUES (p_user_id, p_emoji_type, p_emoji_unicode, p_emoji_id, p_server_id, 1, NOW())
    ON CONFLICT (user_id, emoji_type, emoji_unicode, server_id) 
    DO UPDATE SET 
        usage_count = emoji_usage.usage_count + 1,
        last_used_at = NOW(),
        updated_at = NOW()
    WHERE emoji_usage.user_id = p_user_id 
        AND emoji_usage.emoji_type = p_emoji_type 
        AND emoji_usage.emoji_unicode = p_emoji_unicode 
        AND emoji_usage.server_id = p_server_id;
        
    -- Handle custom emoji case
    IF p_emoji_id IS NOT NULL THEN
        INSERT INTO emoji_usage (user_id, emoji_type, emoji_unicode, emoji_id, server_id, usage_count, last_used_at)
        VALUES (p_user_id, p_emoji_type, p_emoji_unicode, p_emoji_id, p_server_id, 1, NOW())
        ON CONFLICT (user_id, emoji_type, emoji_id, server_id) 
        DO UPDATE SET 
            usage_count = emoji_usage.usage_count + 1,
            last_used_at = NOW(),
            updated_at = NOW()
        WHERE emoji_usage.user_id = p_user_id 
            AND emoji_usage.emoji_type = p_emoji_type 
            AND emoji_usage.emoji_id = p_emoji_id 
            AND emoji_usage.server_id = p_server_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
