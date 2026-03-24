-- 032: Add sales methodology column to company_interview_intel.
-- Enables methodology-aware discovery prep generation.

ALTER TABLE company_interview_intel
  ADD COLUMN IF NOT EXISTS sales_methodology TEXT DEFAULT NULL;

ALTER TABLE company_interview_intel
  ADD COLUMN IF NOT EXISTS methodology_notes TEXT DEFAULT NULL;

-- Seed known company methodologies

UPDATE company_interview_intel SET
  sales_methodology = 'command_of_message',
  methodology_notes = 'Force Management CoM framework company-wide. Before/After scenarios. Pain recap required before recommendation. My recommendation language. Challenger 3Ts.'
WHERE company_name_normalized = 'samsara';

UPDATE company_interview_intel SET
  sales_methodology = 'challenger_spin',
  methodology_notes = 'Challenger Sale + SPIN Selling. Teach-Tailor-Take Control. Implication questions critical. Revenue Intelligence context - show you understand their product. Mock calls often include discovery + demo. Coachability scored heavily.'
WHERE company_name_normalized = 'gong';

UPDATE company_interview_intel SET
  sales_methodology = 'sandler',
  methodology_notes = 'Sandler methodology. Pain qualification is primary. Budget and decision process questions expected. No pressure close. Upfront contracts matter.'
WHERE company_name_normalized = 'salesforce';

UPDATE company_interview_intel SET
  sales_methodology = 'inbound_spin',
  methodology_notes = 'Inbound sales methodology + SPIN. Identify, Connect, Explore, Advise. Strong on buyer journey awareness. Growth stack knowledge expected.'
WHERE company_name_normalized = 'hubspot';

UPDATE company_interview_intel SET
  sales_methodology = 'meddic',
  methodology_notes = 'MEDDIC or MEDDPICC. Metrics, Economic Buyer, Decision Criteria, Decision Process, Identify Pain, Champion. Enterprise-focused discovery. Champion identification scored.'
WHERE company_name_normalized IN ('datadog', 'crowdstrike', 'snowflake');
