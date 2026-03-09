-- Track which companies users are prepping for that we don't have intel on.
-- Lets us prioritize which companies to research next based on actual demand.

CREATE TABLE IF NOT EXISTS company_intel_requests (
  company_name_normalized TEXT PRIMARY KEY,
  company_name TEXT NOT NULL,
  request_count INT DEFAULT 1,
  first_requested_at TIMESTAMPTZ DEFAULT now(),
  requested_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: service role only (written via createAdminClient)
ALTER TABLE company_intel_requests ENABLE ROW LEVEL SECURITY;

-- Index for admin dashboard queries sorted by demand
CREATE INDEX idx_company_intel_requests_count ON company_intel_requests (request_count DESC);

-- Upsert function called from the app (fire-and-forget)
CREATE OR REPLACE FUNCTION upsert_company_intel_request(
  p_company_name TEXT,
  p_normalized TEXT
) RETURNS VOID AS $$
BEGIN
  INSERT INTO company_intel_requests (company_name, company_name_normalized, requested_at)
  VALUES (p_company_name, p_normalized, now())
  ON CONFLICT (company_name_normalized)
  DO UPDATE SET
    request_count = company_intel_requests.request_count + 1,
    requested_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
