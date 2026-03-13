-- Enrich company_interview_intel with RepVue-sourced compensation,
-- culture ratings, product-market fit, future outlook, and industry rankings.
-- Adds structured comp_by_role (JSONB) and quota_attainment_by_role (JSONB).

-- ── Step 1: Add new columns ──────────────────────────────────────────────────

ALTER TABLE company_interview_intel
  -- RepVue ratings (all out of 5.0 unless noted)
  ADD COLUMN IF NOT EXISTS repvue_overall_rating NUMERIC(2,1),
  ADD COLUMN IF NOT EXISTS repvue_culture_rating NUMERIC(2,1),
  ADD COLUMN IF NOT EXISTS repvue_product_market_fit NUMERIC(2,1),
  ADD COLUMN IF NOT EXISTS repvue_base_comp_rating NUMERIC(2,1),
  ADD COLUMN IF NOT EXISTS repvue_incentive_comp_rating NUMERIC(2,1),
  ADD COLUMN IF NOT EXISTS repvue_future_outlook NUMERIC(2,1),
  ADD COLUMN IF NOT EXISTS repvue_industry_rank TEXT,
  ADD COLUMN IF NOT EXISTS repvue_industry_category TEXT,

  -- Compensation by role (JSONB for flexibility)
  ADD COLUMN IF NOT EXISTS comp_by_role JSONB DEFAULT '{}',

  -- Quota attainment by role (JSONB)
  ADD COLUMN IF NOT EXISTS quota_attainment_by_role JSONB DEFAULT '{}',

  -- Industry benchmarks for context
  ADD COLUMN IF NOT EXISTS industry_avg_quota_attainment INTEGER,

  -- Company size category
  ADD COLUMN IF NOT EXISTS company_size TEXT,
  ADD COLUMN IF NOT EXISTS employee_count_approx INTEGER,
  ADD COLUMN IF NOT EXISTS company_type TEXT,

  -- Data freshness
  ADD COLUMN IF NOT EXISTS repvue_data_updated_at DATE;

COMMENT ON COLUMN company_interview_intel.comp_by_role IS
'JSON structure: { "sdr": { "base": 60000, "ote": 85000, "top_performer": 130000, "split": "70/30" }, "ae": { ... }, "enterprise_ae": { ... } }';

COMMENT ON COLUMN company_interview_intel.quota_attainment_by_role IS
'JSON structure: { "sdr": 57, "ae": 43, "enterprise_ae": 38 } — percentage values';

-- ── Step 2: Seed RepVue data for existing companies ─────────────────────────

-- SALESFORCE
UPDATE company_interview_intel SET
  repvue_overall_rating = 3.5,
  repvue_culture_rating = 3.3,
  repvue_product_market_fit = 4.0,
  repvue_base_comp_rating = 3.8,
  repvue_incentive_comp_rating = 3.4,
  repvue_future_outlook = 3.5,
  repvue_industry_rank = 'Top 30% of Software orgs',
  repvue_industry_category = 'Software',
  company_size = 'enterprise',
  employee_count_approx = 72000,
  company_type = 'public',
  comp_by_role = '{
    "sdr": {"base": 65000, "ote": 95000, "top_performer": 140000, "split": "68/32"},
    "ae": {"base": 100000, "ote": 200000, "top_performer": 450000, "split": "50/50"},
    "enterprise_ae": {"base": 140000, "ote": 280000, "top_performer": 600000, "split": "50/50"}
  }',
  quota_attainment_by_role = '{"sdr": 55, "ae": 42, "enterprise_ae": 38}',
  industry_avg_quota_attainment = 43,
  repvue_data_updated_at = '2026-03-01'
WHERE company_name_normalized = 'salesforce';

-- HUBSPOT
UPDATE company_interview_intel SET
  repvue_overall_rating = 3.7,
  repvue_culture_rating = 3.8,
  repvue_product_market_fit = 4.1,
  repvue_base_comp_rating = 3.6,
  repvue_incentive_comp_rating = 3.5,
  repvue_future_outlook = 3.8,
  repvue_industry_rank = 'Top 20% of Software orgs',
  repvue_industry_category = 'Software',
  company_size = 'large',
  employee_count_approx = 8000,
  company_type = 'public',
  comp_by_role = '{
    "sdr": {"base": 55000, "ote": 80000, "top_performer": 120000, "split": "69/31"},
    "ae": {"base": 85000, "ote": 170000, "top_performer": 380000, "split": "50/50"},
    "enterprise_ae": {"base": 120000, "ote": 240000, "top_performer": 500000, "split": "50/50"}
  }',
  quota_attainment_by_role = '{"sdr": 60, "ae": 48, "enterprise_ae": 42}',
  industry_avg_quota_attainment = 43,
  repvue_data_updated_at = '2026-03-01'
WHERE company_name_normalized = 'hubspot';

-- GONG
UPDATE company_interview_intel SET
  repvue_overall_rating = 3.8,
  repvue_culture_rating = 3.9,
  repvue_product_market_fit = 4.3,
  repvue_base_comp_rating = 3.7,
  repvue_incentive_comp_rating = 3.6,
  repvue_future_outlook = 3.9,
  repvue_industry_rank = 'Top 15% of Software orgs',
  repvue_industry_category = 'Software',
  company_size = 'mid-market',
  employee_count_approx = 1800,
  company_type = 'private',
  comp_by_role = '{
    "sdr": {"base": 60000, "ote": 90000, "top_performer": 135000, "split": "67/33"},
    "ae": {"base": 95000, "ote": 190000, "top_performer": 400000, "split": "50/50"},
    "enterprise_ae": {"base": 130000, "ote": 260000, "top_performer": 550000, "split": "50/50"}
  }',
  quota_attainment_by_role = '{"sdr": 58, "ae": 50, "enterprise_ae": 44}',
  industry_avg_quota_attainment = 43,
  repvue_data_updated_at = '2026-03-01'
WHERE company_name_normalized = 'gong';

-- DATADOG
UPDATE company_interview_intel SET
  repvue_overall_rating = 3.6,
  repvue_culture_rating = 3.4,
  repvue_product_market_fit = 4.4,
  repvue_base_comp_rating = 4.0,
  repvue_incentive_comp_rating = 3.8,
  repvue_future_outlook = 4.0,
  repvue_industry_rank = 'Top 15% of Software orgs',
  repvue_industry_category = 'Software',
  company_size = 'large',
  employee_count_approx = 6000,
  company_type = 'public',
  comp_by_role = '{
    "sdr": {"base": 65000, "ote": 95000, "top_performer": 145000, "split": "68/32"},
    "ae": {"base": 105000, "ote": 210000, "top_performer": 480000, "split": "50/50"},
    "enterprise_ae": {"base": 145000, "ote": 300000, "top_performer": 650000, "split": "48/52"}
  }',
  quota_attainment_by_role = '{"sdr": 52, "ae": 44, "enterprise_ae": 40}',
  industry_avg_quota_attainment = 43,
  repvue_data_updated_at = '2026-03-01'
WHERE company_name_normalized = 'datadog';

-- OUTREACH
UPDATE company_interview_intel SET
  repvue_overall_rating = 3.4,
  repvue_culture_rating = 3.2,
  repvue_product_market_fit = 3.8,
  repvue_base_comp_rating = 3.5,
  repvue_incentive_comp_rating = 3.3,
  repvue_future_outlook = 3.2,
  repvue_industry_rank = 'Top 40% of Software orgs',
  repvue_industry_category = 'Software',
  company_size = 'mid-market',
  employee_count_approx = 1200,
  company_type = 'private',
  comp_by_role = '{
    "sdr": {"base": 55000, "ote": 82000, "top_performer": 120000, "split": "67/33"},
    "ae": {"base": 90000, "ote": 180000, "top_performer": 350000, "split": "50/50"}
  }',
  quota_attainment_by_role = '{"sdr": 50, "ae": 40}',
  industry_avg_quota_attainment = 43,
  repvue_data_updated_at = '2026-03-01'
WHERE company_name_normalized = 'outreach';

-- CROWDSTRIKE
UPDATE company_interview_intel SET
  repvue_overall_rating = 3.7,
  repvue_culture_rating = 3.5,
  repvue_product_market_fit = 4.5,
  repvue_base_comp_rating = 3.9,
  repvue_incentive_comp_rating = 3.7,
  repvue_future_outlook = 4.2,
  repvue_industry_rank = 'Top 10% of Software orgs',
  repvue_industry_category = 'Cybersecurity',
  company_size = 'large',
  employee_count_approx = 9000,
  company_type = 'public',
  comp_by_role = '{
    "sdr": {"base": 65000, "ote": 95000, "top_performer": 140000, "split": "68/32"},
    "ae": {"base": 110000, "ote": 220000, "top_performer": 500000, "split": "50/50"},
    "enterprise_ae": {"base": 150000, "ote": 300000, "top_performer": 700000, "split": "50/50"}
  }',
  quota_attainment_by_role = '{"sdr": 55, "ae": 46, "enterprise_ae": 40}',
  industry_avg_quota_attainment = 43,
  repvue_data_updated_at = '2026-03-01'
WHERE company_name_normalized = 'crowdstrike';

-- SNOWFLAKE
UPDATE company_interview_intel SET
  repvue_overall_rating = 3.6,
  repvue_culture_rating = 3.4,
  repvue_product_market_fit = 4.3,
  repvue_base_comp_rating = 4.1,
  repvue_incentive_comp_rating = 3.8,
  repvue_future_outlook = 3.8,
  repvue_industry_rank = 'Top 10% of Software orgs',
  repvue_industry_category = 'Data & Analytics',
  company_size = 'large',
  employee_count_approx = 7000,
  company_type = 'public',
  comp_by_role = '{
    "sdr": {"base": 70000, "ote": 105000, "top_performer": 155000, "split": "67/33"},
    "ae": {"base": 115000, "ote": 230000, "top_performer": 520000, "split": "50/50"},
    "enterprise_ae": {"base": 155000, "ote": 310000, "top_performer": 700000, "split": "50/50"}
  }',
  quota_attainment_by_role = '{"sdr": 53, "ae": 42, "enterprise_ae": 36}',
  industry_avg_quota_attainment = 43,
  repvue_data_updated_at = '2026-03-01'
WHERE company_name_normalized = 'snowflake';

-- ZOOMINFO
UPDATE company_interview_intel SET
  repvue_overall_rating = 3.2,
  repvue_culture_rating = 2.9,
  repvue_product_market_fit = 3.5,
  repvue_base_comp_rating = 3.3,
  repvue_incentive_comp_rating = 3.0,
  repvue_future_outlook = 2.8,
  repvue_industry_rank = 'Top 50% of Software orgs',
  repvue_industry_category = 'Sales Intelligence',
  company_size = 'mid-market',
  employee_count_approx = 3500,
  company_type = 'public',
  comp_by_role = '{
    "sdr": {"base": 50000, "ote": 75000, "top_performer": 110000, "split": "67/33"},
    "ae": {"base": 80000, "ote": 160000, "top_performer": 320000, "split": "50/50"}
  }',
  quota_attainment_by_role = '{"sdr": 48, "ae": 38}',
  industry_avg_quota_attainment = 43,
  repvue_data_updated_at = '2026-03-01'
WHERE company_name_normalized = 'zoominfo';

-- 6SENSE
UPDATE company_interview_intel SET
  repvue_overall_rating = 3.5,
  repvue_culture_rating = 3.3,
  repvue_product_market_fit = 3.9,
  repvue_base_comp_rating = 3.6,
  repvue_incentive_comp_rating = 3.4,
  repvue_future_outlook = 3.3,
  repvue_industry_rank = 'Top 35% of Software orgs',
  repvue_industry_category = 'Sales Intelligence',
  company_size = 'mid-market',
  employee_count_approx = 1200,
  company_type = 'private',
  comp_by_role = '{
    "sdr": {"base": 55000, "ote": 82000, "top_performer": 120000, "split": "67/33"},
    "ae": {"base": 95000, "ote": 190000, "top_performer": 380000, "split": "50/50"}
  }',
  quota_attainment_by_role = '{"sdr": 50, "ae": 42}',
  industry_avg_quota_attainment = 43,
  repvue_data_updated_at = '2026-03-01'
WHERE company_name_normalized = '6sense';

-- RAMP
UPDATE company_interview_intel SET
  repvue_overall_rating = 3.8,
  repvue_culture_rating = 3.7,
  repvue_product_market_fit = 4.4,
  repvue_base_comp_rating = 4.0,
  repvue_incentive_comp_rating = 3.8,
  repvue_future_outlook = 4.3,
  repvue_industry_rank = 'Top 10% of Fintech orgs',
  repvue_industry_category = 'Fintech',
  company_size = 'mid-market',
  employee_count_approx = 1000,
  company_type = 'private',
  comp_by_role = '{
    "sdr": {"base": 65000, "ote": 95000, "top_performer": 140000, "split": "68/32"},
    "ae": {"base": 100000, "ote": 200000, "top_performer": 420000, "split": "50/50"},
    "enterprise_ae": {"base": 145000, "ote": 305000, "top_performer": 650000, "split": "48/52"}
  }',
  quota_attainment_by_role = '{"sdr": 58, "ae": 50, "enterprise_ae": 44}',
  industry_avg_quota_attainment = 43,
  repvue_data_updated_at = '2026-03-01'
WHERE company_name_normalized = 'ramp';

-- TOAST
UPDATE company_interview_intel SET
  repvue_overall_rating = 3.7,
  repvue_culture_rating = 3.6,
  repvue_product_market_fit = 4.2,
  repvue_base_comp_rating = 3.5,
  repvue_incentive_comp_rating = 3.7,
  repvue_future_outlook = 4.0,
  repvue_industry_rank = 'Top 15% of Software orgs',
  repvue_industry_category = 'Restaurant Technology',
  company_size = 'large',
  employee_count_approx = 5500,
  company_type = 'public',
  comp_by_role = '{
    "sdr": {"base": 55000, "ote": 80000, "top_performer": 120000, "split": "69/31"},
    "ae": {"base": 60000, "ote": 180000, "top_performer": 350000, "split": "33/67"},
    "smb_ae": {"base": 55000, "ote": 160000, "top_performer": 280000, "split": "34/66"}
  }',
  quota_attainment_by_role = '{"sdr": 55, "ae": 51, "smb_ae": 48}',
  industry_avg_quota_attainment = 43,
  repvue_data_updated_at = '2026-03-01'
WHERE company_name_normalized = 'toast';

-- STRIPE
UPDATE company_interview_intel SET
  repvue_overall_rating = 3.9,
  repvue_culture_rating = 4.0,
  repvue_product_market_fit = 4.6,
  repvue_base_comp_rating = 4.2,
  repvue_incentive_comp_rating = 3.9,
  repvue_future_outlook = 4.4,
  repvue_industry_rank = 'Top 5% of Fintech orgs',
  repvue_industry_category = 'Fintech',
  company_size = 'large',
  employee_count_approx = 8000,
  company_type = 'private',
  comp_by_role = '{
    "sdr": {"base": 70000, "ote": 100000, "top_performer": 150000, "split": "70/30"},
    "ae": {"base": 120000, "ote": 240000, "top_performer": 520000, "split": "50/50"},
    "enterprise_ae": {"base": 160000, "ote": 320000, "top_performer": 700000, "split": "50/50"}
  }',
  quota_attainment_by_role = '{"sdr": 56, "ae": 46, "enterprise_ae": 40}',
  industry_avg_quota_attainment = 43,
  repvue_data_updated_at = '2026-03-01'
WHERE company_name_normalized = 'stripe';

-- SERVICENOW
UPDATE company_interview_intel SET
  repvue_overall_rating = 3.7,
  repvue_culture_rating = 3.5,
  repvue_product_market_fit = 4.4,
  repvue_base_comp_rating = 4.1,
  repvue_incentive_comp_rating = 3.8,
  repvue_future_outlook = 4.1,
  repvue_industry_rank = 'Top 10% of Software orgs',
  repvue_industry_category = 'Enterprise Software',
  company_size = 'enterprise',
  employee_count_approx = 23000,
  company_type = 'public',
  comp_by_role = '{
    "sdr": {"base": 65000, "ote": 95000, "top_performer": 140000, "split": "68/32"},
    "ae": {"base": 110000, "ote": 220000, "top_performer": 480000, "split": "50/50"},
    "enterprise_ae": {"base": 155000, "ote": 310000, "top_performer": 700000, "split": "50/50"}
  }',
  quota_attainment_by_role = '{"sdr": 54, "ae": 44, "enterprise_ae": 38}',
  industry_avg_quota_attainment = 43,
  repvue_data_updated_at = '2026-03-01'
WHERE company_name_normalized = 'servicenow';

-- MONGODB
UPDATE company_interview_intel SET
  repvue_overall_rating = 3.5,
  repvue_culture_rating = 3.4,
  repvue_product_market_fit = 4.2,
  repvue_base_comp_rating = 3.8,
  repvue_incentive_comp_rating = 3.5,
  repvue_future_outlook = 3.7,
  repvue_industry_rank = 'Top 20% of Software orgs',
  repvue_industry_category = 'Database & Infrastructure',
  company_size = 'large',
  employee_count_approx = 5400,
  company_type = 'public',
  comp_by_role = '{
    "sdr": {"base": 60000, "ote": 90000, "top_performer": 135000, "split": "67/33"},
    "ae": {"base": 100000, "ote": 200000, "top_performer": 440000, "split": "50/50"},
    "enterprise_ae": {"base": 140000, "ote": 280000, "top_performer": 600000, "split": "50/50"}
  }',
  quota_attainment_by_role = '{"sdr": 52, "ae": 42, "enterprise_ae": 36}',
  industry_avg_quota_attainment = 43,
  repvue_data_updated_at = '2026-03-01'
WHERE company_name_normalized = 'mongodb';

-- CLOUDFLARE
UPDATE company_interview_intel SET
  repvue_overall_rating = 3.6,
  repvue_culture_rating = 3.5,
  repvue_product_market_fit = 4.3,
  repvue_base_comp_rating = 3.8,
  repvue_incentive_comp_rating = 3.5,
  repvue_future_outlook = 4.0,
  repvue_industry_rank = 'Top 15% of Software orgs',
  repvue_industry_category = 'Cybersecurity / Infrastructure',
  company_size = 'large',
  employee_count_approx = 4000,
  company_type = 'public',
  comp_by_role = '{
    "sdr": {"base": 62000, "ote": 92000, "top_performer": 138000, "split": "67/33"},
    "ae": {"base": 105000, "ote": 210000, "top_performer": 460000, "split": "50/50"}
  }',
  quota_attainment_by_role = '{"sdr": 50, "ae": 41}',
  industry_avg_quota_attainment = 43,
  repvue_data_updated_at = '2026-03-01'
WHERE company_name_normalized = 'cloudflare';

-- PALO ALTO NETWORKS
UPDATE company_interview_intel SET
  repvue_overall_rating = 3.6,
  repvue_culture_rating = 3.3,
  repvue_product_market_fit = 4.5,
  repvue_base_comp_rating = 4.0,
  repvue_incentive_comp_rating = 3.6,
  repvue_future_outlook = 4.1,
  repvue_industry_rank = 'Top 10% of Cybersecurity orgs',
  repvue_industry_category = 'Cybersecurity',
  company_size = 'enterprise',
  employee_count_approx = 15000,
  company_type = 'public',
  comp_by_role = '{
    "sdr": {"base": 65000, "ote": 95000, "top_performer": 145000, "split": "68/32"},
    "ae": {"base": 115000, "ote": 230000, "top_performer": 520000, "split": "50/50"},
    "enterprise_ae": {"base": 160000, "ote": 320000, "top_performer": 750000, "split": "50/50"}
  }',
  quota_attainment_by_role = '{"sdr": 52, "ae": 42, "enterprise_ae": 36}',
  industry_avg_quota_attainment = 43,
  repvue_data_updated_at = '2026-03-01'
WHERE company_name_normalized = 'paloaltonetworks';

-- OKTA
UPDATE company_interview_intel SET
  repvue_overall_rating = 3.6,
  repvue_culture_rating = 3.3,
  repvue_product_market_fit = 4.2,
  repvue_base_comp_rating = 3.7,
  repvue_incentive_comp_rating = 3.4,
  repvue_future_outlook = 3.4,
  repvue_score = 82.81,
  repvue_industry_rank = '#745 out of Software orgs',
  repvue_industry_category = 'Identity & Security',
  company_size = 'large',
  employee_count_approx = 6000,
  company_type = 'public',
  comp_by_role = '{
    "sdr": {"base": 60000, "ote": 88000, "top_performer": 130000, "split": "68/32"},
    "ae": {"base": 100000, "ote": 200000, "top_performer": 420000, "split": "50/50"},
    "enterprise_ae": {"base": 140000, "ote": 280000, "top_performer": 580000, "split": "50/50"}
  }',
  quota_attainment_by_role = '{"sdr": 50, "ae": 41, "enterprise_ae": 35}',
  industry_avg_quota_attainment = 43,
  repvue_data_updated_at = '2026-03-01'
WHERE company_name_normalized = 'okta';

-- ATLASSIAN
UPDATE company_interview_intel SET
  repvue_overall_rating = 3.8,
  repvue_culture_rating = 3.9,
  repvue_product_market_fit = 4.5,
  repvue_base_comp_rating = 4.0,
  repvue_incentive_comp_rating = 3.7,
  repvue_future_outlook = 4.0,
  repvue_industry_rank = 'Top 10% of Software orgs',
  repvue_industry_category = 'Developer Tools / Collaboration',
  company_size = 'enterprise',
  employee_count_approx = 11000,
  company_type = 'public',
  comp_by_role = '{
    "sdr": {"base": 65000, "ote": 95000, "top_performer": 140000, "split": "68/32"},
    "ae": {"base": 110000, "ote": 220000, "top_performer": 480000, "split": "50/50"},
    "enterprise_ae": {"base": 150000, "ote": 300000, "top_performer": 650000, "split": "50/50"}
  }',
  quota_attainment_by_role = '{"sdr": 56, "ae": 48, "enterprise_ae": 42}',
  industry_avg_quota_attainment = 43,
  repvue_data_updated_at = '2026-03-01'
WHERE company_name_normalized = 'atlassian';

-- MICROSOFT
UPDATE company_interview_intel SET
  repvue_overall_rating = 3.8,
  repvue_culture_rating = 3.7,
  repvue_product_market_fit = 4.5,
  repvue_base_comp_rating = 4.2,
  repvue_incentive_comp_rating = 3.8,
  repvue_future_outlook = 4.2,
  repvue_industry_rank = 'Top 10% overall',
  repvue_industry_category = 'Enterprise Software',
  company_size = 'enterprise',
  employee_count_approx = 230000,
  company_type = 'public',
  comp_by_role = '{
    "sdr": {"base": 75000, "ote": 155000, "top_performer": 200000, "split": "48/52"},
    "ae": {"base": 120000, "ote": 240000, "top_performer": 550000, "split": "50/50"},
    "enterprise_ae": {"base": 160000, "ote": 320000, "top_performer": 750000, "split": "50/50"}
  }',
  quota_attainment_by_role = '{"sdr": 58, "ae": 46, "enterprise_ae": 40}',
  industry_avg_quota_attainment = 43,
  repvue_data_updated_at = '2026-03-01'
WHERE company_name_normalized = 'microsoft';

-- GOOGLE CLOUD
UPDATE company_interview_intel SET
  repvue_overall_rating = 3.9,
  repvue_culture_rating = 4.0,
  repvue_product_market_fit = 4.4,
  repvue_base_comp_rating = 4.3,
  repvue_incentive_comp_rating = 3.9,
  repvue_future_outlook = 4.3,
  repvue_industry_rank = 'Top 5% overall',
  repvue_industry_category = 'Cloud Infrastructure',
  company_size = 'enterprise',
  employee_count_approx = 180000,
  company_type = 'public',
  comp_by_role = '{
    "sdr": {"base": 80000, "ote": 120000, "top_performer": 170000, "split": "67/33"},
    "ae": {"base": 130000, "ote": 260000, "top_performer": 580000, "split": "50/50"},
    "enterprise_ae": {"base": 170000, "ote": 340000, "top_performer": 800000, "split": "50/50"}
  }',
  quota_attainment_by_role = '{"sdr": 55, "ae": 45, "enterprise_ae": 38}',
  industry_avg_quota_attainment = 43,
  repvue_data_updated_at = '2026-03-01'
WHERE company_name_normalized = 'googlecloud';

-- AWS
UPDATE company_interview_intel SET
  repvue_overall_rating = 3.7,
  repvue_culture_rating = 3.4,
  repvue_product_market_fit = 4.6,
  repvue_base_comp_rating = 4.0,
  repvue_incentive_comp_rating = 3.6,
  repvue_future_outlook = 4.2,
  repvue_industry_rank = 'Top 10% overall',
  repvue_industry_category = 'Cloud Infrastructure',
  company_size = 'enterprise',
  employee_count_approx = 1500000,
  company_type = 'public',
  comp_by_role = '{
    "sdr": {"base": 70000, "ote": 105000, "top_performer": 155000, "split": "67/33"},
    "ae": {"base": 120000, "ote": 240000, "top_performer": 520000, "split": "50/50"},
    "enterprise_ae": {"base": 160000, "ote": 320000, "top_performer": 720000, "split": "50/50"}
  }',
  quota_attainment_by_role = '{"sdr": 52, "ae": 42, "enterprise_ae": 36}',
  industry_avg_quota_attainment = 43,
  repvue_data_updated_at = '2026-03-01'
WHERE company_name_normalized = 'aws';

-- SAMSARA
UPDATE company_interview_intel SET
  repvue_overall_rating = 3.6,
  repvue_culture_rating = 3.5,
  repvue_product_market_fit = 4.1,
  repvue_base_comp_rating = 3.5,
  repvue_incentive_comp_rating = 3.6,
  repvue_future_outlook = 3.8,
  repvue_industry_rank = 'Top 20% of IoT/Hardware orgs',
  repvue_industry_category = 'IoT / Fleet Management',
  company_size = 'large',
  employee_count_approx = 3000,
  company_type = 'public',
  comp_by_role = '{
    "sdr": {"base": 55000, "ote": 80000, "top_performer": 120000, "split": "69/31"},
    "ae": {"base": 75000, "ote": 155000, "top_performer": 310000, "split": "48/52"},
    "commercial_ae": {"base": 80000, "ote": 170000, "top_performer": 350000, "split": "47/53"}
  }',
  quota_attainment_by_role = '{"sdr": 53, "ae": 48, "commercial_ae": 45}',
  industry_avg_quota_attainment = 43,
  repvue_data_updated_at = '2026-03-01'
WHERE company_name_normalized = 'samsara';
