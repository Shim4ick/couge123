-- Add allow_messages column to channels table
ALTER TABLE channels
ADD COLUMN allow_messages BOOLEAN NOT NULL DEFAULT TRUE;

-- Update existing channels to allow messages by default
UPDATE channels
SET allow_messages = TRUE
WHERE allow_messages IS NULL;
