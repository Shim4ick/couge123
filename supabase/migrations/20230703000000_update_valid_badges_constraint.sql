-- Update the check constraint for valid badges
ALTER TABLE profiles DROP CONSTRAINT valid_badges;

ALTER TABLE profiles
ADD CONSTRAINT valid_badges CHECK (
  badges <@ ARRAY['founder', 'staff', 'beta']::text[]
);
