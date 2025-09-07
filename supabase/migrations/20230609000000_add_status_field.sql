-- Add status field to profiles if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'profiles' AND column_name = 'status') THEN
        ALTER TABLE profiles 
        ADD COLUMN status TEXT DEFAULT 'online' 
        CHECK (status IN ('online', 'idle', 'dnd', 'invisible'));
    END IF;
END $$;

-- Update existing profiles to have 'online' status if null
UPDATE profiles
SET status = 'online'
WHERE status IS NULL;
