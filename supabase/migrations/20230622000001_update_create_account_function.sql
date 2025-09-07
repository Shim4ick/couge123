-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS create_account_and_use_invite;

-- Create an updated version with better error handling
CREATE OR REPLACE FUNCTION create_account_and_use_invite(
  p_invite_code TEXT,
  p_email TEXT,
  p_password TEXT,
  p_username TEXT,
  p_nickname TEXT,
  p_avatar TEXT
) RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_result JSONB;
BEGIN
  -- Check if the invite code exists and is unused
  IF NOT EXISTS (
    SELECT 1 FROM invite_codes
    WHERE code = p_invite_code 
    AND email = p_email 
    AND used_by IS NULL
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid or already used invite code',
      'step', 'invite_code_validation'
    );
  END IF;

  -- Check if username is already taken
  IF EXISTS (
    SELECT 1 FROM profiles
    WHERE username = p_username
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Username already taken',
      'step', 'username_check'
    );
  END IF;

  -- Create the user account
  BEGIN
    INSERT INTO auth.users (
      email,
      encrypted_password,
      raw_user_meta_data,
      email_confirmed_at
    )
    VALUES (
      p_email,
      p_password,
      jsonb_build_object(
        'username', p_username,
        'nickname', p_nickname,
        'avatar', p_avatar
      ),
      NOW()
    )
    RETURNING id INTO v_user_id;
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Failed to create user account: ' || SQLERRM,
      'step', 'user_creation'
    );
  END;

  -- Create the user profile
  BEGIN
    INSERT INTO public.profiles (
      id,
      username,
      display_name,
      avatar_url
    )
    VALUES (
      v_user_id,
      p_username,
      p_nickname,
      p_avatar
    );
  EXCEPTION WHEN OTHERS THEN
    -- Attempt to clean up the auth.users entry if profile creation fails
    DELETE FROM auth.users WHERE id = v_user_id;
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Failed to create user profile: ' || SQLERRM,
      'step', 'profile_creation'
    );
  END;

  -- Mark the invite code as used
  BEGIN
    UPDATE invite_codes
    SET 
      used_by = v_user_id,
      used_at = NOW()
    WHERE code = p_invite_code
    AND email = p_email;
  EXCEPTION WHEN OTHERS THEN
    -- Log the error but don't fail the whole transaction
    RAISE WARNING 'Failed to update invite code: %', SQLERRM;
  END;

  RETURN jsonb_build_object(
    'success', true,
    'user_id', v_user_id
  );

EXCEPTION WHEN OTHERS THEN
  -- Catch any other unexpected errors
  RETURN jsonb_build_object(
    'success', false,
    'error', 'Unexpected error: ' || SQLERRM,
    'step', 'unknown'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION create_account_and_use_invite TO authenticated;
GRANT EXECUTE ON FUNCTION create_account_and_use_invite TO service_role;
