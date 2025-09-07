-- Add is_verified column to servers table
ALTER TABLE servers
ADD COLUMN is_verified BOOLEAN DEFAULT FALSE;

-- Update existing servers to have is_verified as false
UPDATE servers
SET is_verified = FALSE
WHERE is_verified IS NULL;
