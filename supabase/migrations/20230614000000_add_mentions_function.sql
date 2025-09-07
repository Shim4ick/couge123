-- Create a function to process mentions and create notifications
CREATE OR REPLACE FUNCTION process_mentions() 
RETURNS TRIGGER AS $$
DECLARE
    mentioned_user_id UUID;
    server_id INT;
    mention_match TEXT;
BEGIN
    -- Extract mentioned usernames from the message content
    FOR mention_match IN 
        SELECT (regexp_matches(NEW.content, '@(\w+)', 'g'))[1]
    LOOP
        -- Find the user ID for the mentioned username
        SELECT id INTO mentioned_user_id 
        FROM profiles 
        WHERE username = mention_match;

        IF mentioned_user_id IS NOT NULL THEN
            -- Get the server ID for the channel
            SELECT server_id INTO server_id 
            FROM channels 
            WHERE id = NEW.channel_id;

            -- Create or update the notification
            INSERT INTO notifications (user_id, channel_id, server_id, count)
            VALUES (mentioned_user_id, NEW.channel_id, server_id, 1)
            ON CONFLICT (user_id, channel_id) 
            DO UPDATE SET count = notifications.count + 1;

            -- Add the mentioned user ID to the mentions array of the message
            NEW.mentions = array_append(NEW.mentions, mentioned_user_id);
        END IF;
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to call the function when a new message is inserted
CREATE TRIGGER process_mentions_trigger
BEFORE INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION process_mentions();

-- Add a mentions column to the messages table
ALTER TABLE messages
ADD COLUMN mentions UUID[] DEFAULT '{}';

-- Create a notifications table
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    channel_id INT NOT NULL REFERENCES channels(id),
    server_id INT NOT NULL REFERENCES servers(id),
    count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(user_id, channel_id)
);

-- Add indexes for better performance
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_channel_id ON notifications(channel_id);
CREATE INDEX idx_notifications_server_id ON notifications(server_id);
