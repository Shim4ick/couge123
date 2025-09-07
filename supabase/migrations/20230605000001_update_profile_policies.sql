-- Drop existing policies
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Allow anyone to insert a profile (needed for registration)
CREATE POLICY "Anyone can insert a profile"
ON profiles
FOR INSERT
TO public
WITH CHECK (true);

-- Allow authenticated users to view all profiles
CREATE POLICY "Profiles are viewable by authenticated users"
ON profiles
FOR SELECT
TO authenticated
USING (true);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile"
ON profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id);

-- Ensure RLS is enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
