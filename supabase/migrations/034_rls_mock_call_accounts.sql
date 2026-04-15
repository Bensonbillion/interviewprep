-- 034: Enable RLS on mock_call_accounts
-- This table contains shared reference data (account templates for mock calls).
-- RLS is enabled with a read-only policy for authenticated users.
-- Only the service role can insert/update/delete.

ALTER TABLE mock_call_accounts ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read all mock call accounts (shared reference data)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'mock_call_accounts' AND policyname = 'authenticated_read_mock_accounts'
  ) THEN
    CREATE POLICY "authenticated_read_mock_accounts"
      ON mock_call_accounts FOR SELECT TO authenticated
      USING (true);
  END IF;
END
$$;
