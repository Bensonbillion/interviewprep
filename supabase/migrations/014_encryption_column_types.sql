-- Migration: Change salary columns from INTEGER to TEXT
-- to support application-level AES-256-GCM encryption.
-- Encrypted values are stored as versioned strings: v1:iv:authTag:ciphertext

ALTER TABLE interview_reports
  ALTER COLUMN offer_base_salary TYPE TEXT USING offer_base_salary::TEXT,
  ALTER COLUMN offer_ote TYPE TEXT USING offer_ote::TEXT;
