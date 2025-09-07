-- Update the process_mentions function to check server membership
CREATE OR REPLACE FUNCTION process_mentions() 
RETURNS TRIGGER AS $$
DECLARE
    mentioned_user_id UUID;
    server_id INT;
    mention_match TEXT;
    is_server_member BOOLEAN;
BEGIN
    -- Get the server ID for the channel
    SELECT server_id INTO server_id 
    FROM channels 
    WHERE id = NEW.channel_id;

    -- Extract mentioned usernames from the message content
    FOR mention_match IN 
        SELECT (regexp_matches(NEW.content, '@(\w+)', 'g'))[1]
    LOOP
        -- Find the user ID for the mentioned username
        SELECT id INTO mentioned_user_id 
        FROM profiles 
        WHERE username = mention_match;

        IF mentioned_user_id IS NOT NULL THEN
            -- Check if the mentioned user is a member of the server
            SELECT EXISTS (
                SELECT 1 
                FROM server_members 
                WHERE user_id = mentioned_user_id AND server_id = server_id
            ) INTO is_server_member;

            IF is_server_member THEN
                -- Create or update the notification
                INSERT INTO notifications (user_id, channel_id, server_id, count)
                VALUES (mentioned_user_id, NEW.channel_id, server_id, 1)
                ON CONFLICT (user_id, channel_id) 
                DO UPDATE SET count = notifications.count + 1;

                -- Add the mentioned user ID to the mentions array of the message
                NEW.mentions = array_append(NEW.mentions, mentioned_user_id);
            END IF;
        END IF;
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
