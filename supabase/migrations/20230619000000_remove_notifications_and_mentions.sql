-- Drop the notifications table
DROP TABLE IF EXISTS notifications;

-- Remove the mentions column from the messages table
ALTER TABLE messages DROP COLUMN IF EXISTS mentions;

-- Drop the process_mentions function and trigger
DROP TRIGGER IF EXISTS process_mentions_trigger ON messages;
DROP FUNCTION IF EXISTS process_mentions();

-- Remove any indexes related to notifications or mentions
DROP INDEX IF EXISTS idx_notifications_user_id;
DROP INDEX IF EXISTS idx_notifications_channel_id;
DROP INDEX IF EXISTS idx_notifications_server_id;
