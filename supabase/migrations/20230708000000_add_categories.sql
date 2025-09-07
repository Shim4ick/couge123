-- Create categories table
CREATE TABLE categories (
  id BIGSERIAL PRIMARY KEY,
  server_id BIGINT REFERENCES servers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Add category_id to channels table
ALTER TABLE channels
ADD COLUMN category_id BIGINT REFERENCES categories(id) ON DELETE SET NULL;

-- Add position column to channels table for ordering within a category
ALTER TABLE channels
ADD COLUMN position INTEGER NOT NULL DEFAULT 0;

-- Create index for faster queries
CREATE INDEX idx_channels_category_id ON channels(category_id);

-- Update existing channels to have a default position
UPDATE channels
SET position = id;

-- Add policies for categories table
CREATE POLICY "Server owners can manage categories"
ON categories
FOR ALL
TO authenticated
USING (
  auth.uid() IN (
    SELECT owner_id FROM servers WHERE id = server_id
  )
);

-- Enable RLS on categories table
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
