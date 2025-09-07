-- Create invite_codes table
CREATE TABLE invite_codes (
  id SERIAL PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  used_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE
);

-- Create index for faster lookups
CREATE INDEX idx_invite_codes_code ON invite_codes(code);

-- Create function to create account and use invite code
CREATE OR REPLACE FUNCTION create_account_and_use_invite(
  p_invite_code TEXT,
  p_email TEXT,
  p_password TEXT,
  p_username TEXT,
  p_nickname TEXT,
  p_avatar TEXT
) RETURNS VOID AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Check if the invite code is valid and unused
  IF NOT EXISTS (
    SELECT 1 FROM invite_codes
    WHERE code = p_invite_code AND email = p_email AND used_by IS NULL
  ) THEN
    RAISE EXCEPTION 'Invalid or already used invite code';
  END IF;

  -- Create the user account
  INSERT INTO auth.users (email, encrypted_password, raw_user_meta_data)
  VALUES (p_email, p_password, jsonb_build_object(
    'username', p_username,
    'nickname', p_nickname,
    'avatar', p_avatar
  ))
  RETURNING id INTO v_user_id;

  -- Create the user profile
  INSERT INTO public.profiles (id, username, display_name, avatar_url)
  VALUES (v_user_id, p_username, p_nickname, p_avatar);

  -- Mark the invite code as used
  UPDATE invite_codes
  SET used_by = v_user_id, used_at = NOW()
  WHERE code = p_invite_code AND email = p_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE, SELECT ON SEQUENCE invite_codes_id_seq TO authenticated;
GRANT ALL ON TABLE invite_codes TO authenticated;
GRANT EXECUTE ON FUNCTION create_account_and_use_invite TO authenticated;
