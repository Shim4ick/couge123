-- Drop existing tables if they exist to avoid conflicts
DROP TABLE IF EXISTS friends CASCADE;
DROP TABLE IF EXISTS friend_requests CASCADE;

-- Create friend_requests table with proper foreign key references
CREATE TABLE friend_requests (
  id BIGSERIAL PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected', 'canceled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(sender_id, recipient_id)
);

-- Create friends table to store accepted friendships
CREATE TABLE friends (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(user_id, friend_id)
);

-- Add indexes for better performance
CREATE INDEX idx_friend_requests_sender_id ON friend_requests(sender_id);
CREATE INDEX idx_friend_requests_recipient_id ON friend_requests(recipient_id);
CREATE INDEX idx_friend_requests_status ON friend_requests(status);
CREATE INDEX idx_friends_user_id ON friends(user_id);
CREATE INDEX idx_friends_friend_id ON friends(friend_id);

-- Add trigger to update updated_at column
CREATE OR REPLACE FUNCTION update_friend_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_friend_requests_updated_at
BEFORE UPDATE ON friend_requests
FOR EACH ROW
EXECUTE FUNCTION update_friend_requests_updated_at();

-- Add RLS policies
ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE friends ENABLE ROW LEVEL SECURITY;

-- Friend requests policies
CREATE POLICY "Users can view their own sent and received friend requests"
ON friend_requests
FOR SELECT
TO authenticated
USING (
  auth.uid() = sender_id OR auth.uid() = recipient_id
);

CREATE POLICY "Users can insert their own friend requests"
ON friend_requests
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = sender_id
);

CREATE POLICY "Users can update their own friend requests"
ON friend_requests
FOR UPDATE
TO authenticated
USING (
  auth.uid() = sender_id OR auth.uid() = recipient_id
);

-- Friends policies
CREATE POLICY "Users can view their own friends"
ON friends
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id OR auth.uid() = friend_id
);

CREATE POLICY "Users can insert their own friends"
ON friends
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
);

CREATE POLICY "Users can delete their own friends"
ON friends
FOR DELETE
TO authenticated
USING (
  auth.uid() = user_id OR auth.uid() = friend_id
);

-- Create function to accept friend request and create friendship
CREATE OR REPLACE FUNCTION accept_friend_request(request_id BIGINT)
RETURNS VOID AS $$
DECLARE
  v_sender_id UUID;
  v_recipient_id UUID;
BEGIN
  -- Get the sender and recipient IDs
  SELECT sender_id, recipient_id INTO v_sender_id, v_recipient_id
  FROM friend_requests
  WHERE id = request_id AND status = 'pending';
  
  -- If request exists and is pending
  IF FOUND THEN
    -- Update the request status to accepted
    UPDATE friend_requests
    SET status = 'accepted'
    WHERE id = request_id;
    
    -- Create friendship records (bidirectional)
    INSERT INTO friends (user_id, friend_id)
    VALUES (v_sender_id, v_recipient_id), (v_recipient_id, v_sender_id)
    ON CONFLICT DO NOTHING;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check if a friend request can be sent
CREATE OR REPLACE FUNCTION can_send_friend_request(sender UUID, recipient UUID)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  -- Check if sender and recipient are the same
  IF sender = recipient THEN
    RETURN jsonb_build_object('can_send', false, 'reason', 'cannot_add_self');
  END IF;

  -- Check if they are already friends
  IF EXISTS (
    SELECT 1 FROM friends
    WHERE (user_id = sender AND friend_id = recipient)
  ) THEN
    RETURN jsonb_build_object('can_send', false, 'reason', 'already_friends');
  END IF;

  -- Check if there's a pending request
  IF EXISTS (
    SELECT 1 FROM friend_requests
    WHERE 
      ((sender_id = sender AND recipient_id = recipient) OR 
       (sender_id = recipient AND recipient_id = sender))
      AND status = 'pending'
  ) THEN
    RETURN jsonb_build_object('can_send', false, 'reason', 'pending_request_exists');
  END IF;

  -- All checks passed
  RETURN jsonb_build_object('can_send', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
