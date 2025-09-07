-- Drop the process_mentions trigger since we're now handling mentions client-side
DROP TRIGGER IF EXISTS process_mentions_trigger ON messages;
DROP FUNCTION IF EXISTS process_mentions();

-- Make sure the mentions column still exists
ALTER TABLE messages ADD COLUMN IF NOT EXISTS mentions UUID[] DEFAULT '{}';
