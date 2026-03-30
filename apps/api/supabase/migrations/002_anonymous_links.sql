-- ============================================================
-- Qurl URL Shortener — Anonymous Links
-- ============================================================

-- Allow null user_id for anonymous links
ALTER TABLE urls ALTER COLUMN user_id DROP NOT NULL;

-- Update default links_limit from 25 to 20
ALTER TABLE profiles ALTER COLUMN links_limit SET DEFAULT 20;

-- Add RLS policy for service role to insert anonymous links
CREATE POLICY "Service role can insert urls"
  ON urls FOR INSERT
  WITH CHECK (auth.role() = 'service_role');
