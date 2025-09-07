-- Update the upsert_emoji_usage function for clarity and correctness
CREATE OR REPLACE FUNCTION upsert_emoji_usage(
    p_user_id UUID,
    p_emoji_type TEXT,
    p_emoji_unicode TEXT DEFAULT NULL,
    p_emoji_id INTEGER DEFAULT NULL,
    p_server_id INTEGER DEFAULT NULL
) RETURNS void AS $$
BEGIN
    IF p_emoji_type = 'unicode' THEN
        INSERT INTO emoji_usage (user_id, emoji_type, emoji_unicode, server_id, usage_count, last_used_at, updated_at)
        VALUES (p_user_id, p_emoji_type, p_emoji_unicode, p_server_id, 1, NOW(), NOW())
        ON CONFLICT (user_id, emoji_type, emoji_unicode, server_id)
        DO UPDATE SET 
            usage_count = emoji_usage.usage_count + 1,
            last_used_at = NOW(),
            updated_at = NOW();
    ELSIF p_emoji_type = 'custom' AND p_emoji_id IS NOT NULL THEN
        INSERT INTO emoji_usage (user_id, emoji_type, emoji_id, server_id, usage_count, last_used_at, updated_at)
        VALUES (p_user_id, p_emoji_type, p_emoji_id, p_server_id, 1, NOW(), NOW())
        ON CONFLICT (user_id, emoji_type, emoji_id, server_id)
        DO UPDATE SET 
            usage_count = emoji_usage.usage_count + 1,
            last_used_at = NOW(),
            updated_at = NOW();
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
