-- Create custom_emojis table
CREATE TABLE IF NOT EXISTS custom_emojis (
  id SERIAL PRIMARY KEY,
  server_id INTEGER NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
  name VARCHAR(32) NOT NULL,
  image_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE(server_id, name)
);

-- Create emoji_usage table for tracking frequently used emojis
CREATE TABLE IF NOT EXISTS emoji_usage (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji_type VARCHAR(20) NOT NULL, -- 'custom' or 'unicode'
  emoji_id INTEGER REFERENCES custom_emojis(id) ON DELETE CASCADE, -- for custom emojis
  emoji_unicode TEXT, -- for unicode emojis
  server_id INTEGER REFERENCES servers(id) ON DELETE CASCADE, -- context where emoji was used
  usage_count INTEGER DEFAULT 1,
  last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, emoji_type, emoji_id, emoji_unicode, server_id)
);

-- RLS policies for custom_emojis
ALTER TABLE custom_emojis ENABLE ROW LEVEL SECURITY;

-- Users can view emojis from servers they're members of
CREATE POLICY "Users can view custom emojis from their servers" ON custom_emojis
  FOR SELECT USING (
    server_id IN (
      SELECT server_id FROM server_members WHERE user_id = auth.uid()
    )
  );

-- Only server owners can manage custom emojis
CREATE POLICY "Server owners can manage custom emojis" ON custom_emojis
  FOR ALL USING (
    server_id IN (
      SELECT id FROM servers WHERE owner_id = auth.uid()
    )
  );

-- RLS policies for emoji_usage
ALTER TABLE emoji_usage ENABLE ROW LEVEL SECURITY;

-- Users can only manage their own emoji usage
CREATE POLICY "Users can manage their own emoji usage" ON emoji_usage
  FOR ALL USING (user_id = auth.uid());

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_custom_emojis_server_id ON custom_emojis(server_id);
CREATE INDEX IF NOT EXISTS idx_emoji_usage_user_id ON emoji_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_emoji_usage_last_used ON emoji_usage(last_used_at DESC);
