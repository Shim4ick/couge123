-- Add paused_invites column to servers table
ALTER TABLE servers
ADD COLUMN paused_invites BOOLEAN DEFAULT FALSE;

-- Update existing servers to have paused_invites as false
UPDATE servers
SET paused_invites = FALSE
WHERE paused_invites IS NULL;
