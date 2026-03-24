-- 031: Mock call intelligence — new columns, tables, and Samsara seeding.
-- Supports deep-discovery mock call prep with persona-based scoring guides.

-- ═══════════════════════════════════════════════════════════════════════════════
-- SECTION A — Add columns to prep_sessions
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'prep_sessions' AND column_name = 'mock_call_type'
  ) THEN
    ALTER TABLE prep_sessions
      ADD COLUMN mock_call_type TEXT
        CHECK (mock_call_type IN ('cold_call', 'discovery', 'demo') OR mock_call_type IS NULL)
        DEFAULT NULL;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'prep_sessions' AND column_name = 'mock_call_persona'
  ) THEN
    ALTER TABLE prep_sessions
      ADD COLUMN mock_call_persona TEXT DEFAULT NULL;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'prep_sessions' AND column_name = 'live_mode_enabled'
  ) THEN
    ALTER TABLE prep_sessions
      ADD COLUMN live_mode_enabled BOOLEAN DEFAULT false;
  END IF;
END
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- SECTION B — Create mock_call_sessions table
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS mock_call_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES prep_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  mock_call_type TEXT NOT NULL,
  persona TEXT,
  company_name TEXT,
  account_context TEXT,
  interviewer_name TEXT,
  interviewer_context TEXT,
  hypothesis TEXT,
  question_cards JSONB DEFAULT '[]'::jsonb,
  trap_cards JSONB DEFAULT '[]'::jsonb,
  scoring_guide JSONB DEFAULT '{}'::jsonb,
  value_drivers JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE mock_call_sessions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'mock_call_sessions' AND policyname = 'users_own_mock_sessions'
  ) THEN
    CREATE POLICY "users_own_mock_sessions"
      ON mock_call_sessions FOR ALL TO authenticated
      USING ((SELECT auth.uid()) = user_id)
      WITH CHECK ((SELECT auth.uid()) = user_id);
  END IF;
END
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- SECTION C — Create mock_call_accounts table
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS mock_call_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_name TEXT NOT NULL,
  account_name_normalized TEXT UNIQUE,
  industry TEXT,
  fleet_size_estimate TEXT,
  primary_pain_driver TEXT,
  before_scenario TEXT,
  business_pain_estimate TEXT,
  key_discovery_questions JSONB DEFAULT '[]'::jsonb,
  relevant_proof_points JSONB DEFAULT '[]'::jsonb,
  hypothesis_template TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- SECTION D — Enrich Samsara in company_interview_intel
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO company_interview_intel (
  company_name,
  company_name_normalized,
  interview_rounds,
  avg_days_to_hire,
  key_test,
  unique_element,
  mock_call_format,
  common_questions,
  red_flags,
  tips,
  sdr_satisfaction_score
) VALUES (
  'Samsara',
  'samsara',
  4,
  21,
  'Deep discovery mock call scored on 7 categories: Industry Pain, Persona Pain, Active Listening, Current State, Technical Pain, Personal Pain, Business Pain. Uses Command of the Message (Force Management) framework. Evaluator looks for 2nd and 3rd level pain depth, pain recap before recommendation, and my recommendation language for solution transitions. Challenger 3Ts expected: Teach, Tailor, Take Control.',
  'Samsara runs Force Management Command of the Message company-wide. Three value drivers: Reduce Risk (safety, accidents, compliance), Increase Efficiency (fuel, maintenance, operating costs), Digitally Transform The Business (single platform, workflows, driver experience). Luke O Connor evaluation focus: identify deal risk early, before and after scenarios, pain recap before solution, my recommendation language, exploring 2nd and 3rd level pain, Challenger 3Ts, expanding scope of opportunity.',
  '10-minute deep discovery. Persona: Safety Manager, Fleet Director, or VP Operations. Use Iceberg Framework: Technical (surface) then Personal (frustration) then Business (quantified cost). Must recap all pain threads before transitioning to solution. Required transition phrase: Based on everything you have shared, my recommendation would be. Grader is forthcoming and will give real answers to dig into.',
  ARRAY[
    'Walk me through your discovery process',
    'How do you identify pain beyond the surface level?',
    'What is your understanding of our value drivers?',
    'Mock discovery call with a fleet operations persona'
  ],
  ARRAY[
    'Pitching before completing discovery',
    'Not recapping pain before recommending a solution',
    'Staying at surface-level technical pain only',
    'Not using my recommendation language for transitions'
  ],
  ARRAY[
    'Business Hypothesis formula: Because of [industry or persona pain], the company may be experiencing [negative impact on safety, efficiency, or sustainability]',
    'Construction is Samsara number 1 growth vertical — highest net new ACV for 6 consecutive quarters',
    'Top proof point: TEAMS Transport Canada — $1M+ insurance savings, 63% HOS violation reduction in one year',
    'Top proof point: ITF Group — $4.4M saved in insurance premiums, 50% reduction in risky behaviors',
    'Samsara 2025 Safety Report: 73% crash rate reduction over 30 months across 2600+ fleets',
    'IDC 2024: Samsara customers cut total fleet operating costs 6% on average — $2M annual savings per organization',
    'Trap question for real-time coaching: When one of your drivers shows fatigue at 2am, how does your current system detect that and intervene?',
    'Trap question for unified platform: When you investigate an incident, how many different systems do you open to get the full picture?',
    'Luke O Connor key focus areas: identify risk early, before after scenarios, Command of Message, pain recap before recommendation, my recommendation language, 2nd and 3rd level pain, Challenger 3Ts, expanding scope'
  ],
  3.6
)
ON CONFLICT (company_name_normalized) DO UPDATE SET
  key_test = EXCLUDED.key_test,
  unique_element = EXCLUDED.unique_element,
  mock_call_format = EXCLUDED.mock_call_format,
  common_questions = EXCLUDED.common_questions,
  red_flags = EXCLUDED.red_flags,
  tips = EXCLUDED.tips;

-- ═══════════════════════════════════════════════════════════════════════════════
-- SECTION E — Seed construction account in mock_call_accounts
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO mock_call_accounts (
  account_name,
  account_name_normalized,
  industry,
  fleet_size_estimate,
  primary_pain_driver,
  before_scenario,
  business_pain_estimate,
  key_discovery_questions,
  relevant_proof_points,
  hypothesis_template
) VALUES (
  'Construction Company',
  'construction_generic',
  'construction',
  '50 to 500 vehicles and heavy equipment',
  'reduce_risk',
  'Construction fleets rely on paper DVIRs, basic GPS, and 3 to 5 disconnected systems. Safety incidents are investigated reactively with footage that takes days to retrieve. Coaching happens weekly at best, not in real time. Insurance premiums have risen 20% or more market-wide and CSA scores face increased FMCSA scrutiny.',
  '$200K to $800K annually in preventable incident costs, insurance increases, and compliance penalties. Average crash costs $16,500 before litigation. Nuclear verdicts in trucking average $27.5M.',
  '[
    {"layer":"technical","question":"Walk me through what happens when a safety event occurs from the moment it happens to when the driver gets coached. What does that timeline look like?","listenFor":"days of delay, manual process, footage retrieval time","followUp":"So between when the event happens and when coaching happens, what is the gap? And how effective is coaching three days after the fact?"},
    {"layer":"technical","question":"What systems are you using today to track driver behavior? Are those integrated or are you toggling between platforms?","listenFor":"disconnected systems, spreadsheets, manual reconciliation","followUp":"When you investigate an incident, how many different systems do you open to get the full picture?"},
    {"layer":"technical","question":"When you need footage from an incident, how quickly can you pull it and how complete is it?","listenFor":"upload delays, clip-only systems, missing context before the event","followUp":"If you needed footage from the ten minutes before a collision, not just the impact, how would you get that today?"},
    {"layer":"personal","question":"What part of managing safety takes up more time than it should for you personally?","listenFor":"manual review, coaching prep, incident investigation, report building","followUp":"How much time per week goes into that? If you got that time back, what would you do with it?"},
    {"layer":"personal","question":"When something goes wrong on the road, what does that first hour look like for you?","listenFor":"scrambling for footage, manual documentation, notifying leadership","followUp":"What would your ideal version of that first hour look like if you had everything in one place?"},
    {"layer":"personal","question":"How confident are you that your coaching is reaching the highest-risk drivers? Is there a chance your team is focusing on the wrong people?","listenFor":"guesswork, reactive prioritization, arbitrary coaching decisions","followUp":"What would it mean for your program if you could guarantee you were coaching the right drivers every time?"},
    {"layer":"business","question":"What did your last significant accident cost the company when you add up investigation time, legal fees, repair, and insurance impact?","listenFor":"specific dollar amounts, lawyer involvement, insurance renewal pressure","followUp":"And since that incident, how has your insurance premium moved at renewal?"},
    {"layer":"business","question":"If you are spending that many hours a week on manual processes, what does that add up to across your safety team over a year?","listenFor":"calculate with them — hours times people times hourly rate","followUp":"So conservatively you are looking at that much just in labor on manual safety processes. Does that track?"},
    {"layer":"business","question":"Is leadership asking harder questions about liability exposure and what your safety program can actually prove?","listenFor":"board pressure, insurance carrier pressure, personal career risk","followUp":"Nuclear verdicts in trucking, jury awards over $10M, have become more common. Has that conversation come up internally?"}
  ]'::jsonb,
  '[
    {"company":"TEAMS Transport Canada","result":"$1M plus insurance savings, 63% HOS violation reduction in one year"},
    {"company":"ITF Group","result":"$4.4M saved in insurance premiums, 50% reduction in risky behaviors"},
    {"company":"The Home Depot","result":"80% reduction in auto incidents over three years, 62% decrease in total claims"},
    {"company":"Primoris Services Corporation","result":"66% reduction in total safety events, $2M annual insurance savings"},
    {"company":"Samsara 2025 Safety Report","result":"73% crash rate reduction over 30 months across 2600 plus fleets"}
  ]'::jsonb,
  'Because construction fleets face reactive safety models and increasing nuclear verdict exposure, [COMPANY] may be experiencing escalating liability costs and pressure from leadership to prove their safety program is actually working rather than just documenting after accidents happen.'
) ON CONFLICT (account_name_normalized) DO NOTHING;
