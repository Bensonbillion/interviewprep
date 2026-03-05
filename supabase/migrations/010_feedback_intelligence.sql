-- Migration 010: Extended feedback intelligence schema
-- NOTE: session_id is TEXT throughout (client-side IDs, no FK to prep_sessions — v1 sessions are sessionStorage-only).
-- NOTE: answer_feedback already exists (migration 003) as the thumbs/copy log. The new
--       explicit rating table is named answer_explicit_feedback to avoid collision.
-- NOTE: interview_reports already exists (migration 009). Extended here via ALTER TABLE.

-- ============================================================
-- LAYER 1: IMPLICIT FEEDBACK (auto-captured behavioral signals)
-- ============================================================

CREATE TABLE answer_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,                              -- client-side TEXT ID
  answer_id UUID REFERENCES generated_answers(id)        -- set when answer was DB-persisted
    ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  answer_type TEXT NOT NULL,

  -- Edit tracking
  original_text TEXT,
  edited_text TEXT,
  edit_distance_chars INTEGER,
  edit_distance_words INTEGER,
  edit_type TEXT CHECK (edit_type IN (
    'none', 'minor_rewording', 'significant_edit',
    'complete_rewrite', 'addition', 'deletion'
  )),

  -- Behavioral signals
  time_on_card_seconds INTEGER,
  card_expanded BOOLEAN DEFAULT false,
  card_collapsed_without_reading BOOLEAN DEFAULT false,
  copied_to_clipboard BOOLEAN DEFAULT false,
  regeneration_count INTEGER DEFAULT 0,
  regeneration_with_prompt_change BOOLEAN,

  -- Quality signal
  explicit_rating SMALLINT CHECK (explicit_rating BETWEEN 1 AND 5),

  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_interactions_answer_type ON answer_interactions(answer_type);
CREATE INDEX idx_interactions_session     ON answer_interactions(session_id);

ALTER TABLE answer_interactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON answer_interactions
  FOR ALL USING (auth.role() = 'service_role');
-- Users can read their own interaction history
CREATE POLICY "users_select_own" ON answer_interactions
  FOR SELECT USING (user_id = auth.uid());

-- ============================================================
-- LAYER 2a: EXPLICIT ANSWER FEEDBACK (user-initiated rating)
-- Separate from the existing answer_feedback table (thumbs/copy log in migration 003).
-- ============================================================

CREATE TABLE answer_explicit_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  answer_id UUID REFERENCES generated_answers(id) ON DELETE SET NULL,
  session_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  answer_type TEXT NOT NULL,

  -- 1–5 star rating
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),

  -- Specific dimensions (shown selectively based on answer type)
  sounds_natural BOOLEAN,  -- "Does this sound like something you'd actually say?"
  too_long       BOOLEAN,
  too_short      BOOLEAN,
  too_generic    BOOLEAN,
  missing_detail BOOLEAN,

  -- Free text — user-written alternatives become prompt training data
  how_would_you_say_it TEXT,  -- "How would you actually answer this?"
  what_would_improve   TEXT,  -- "What's missing or wrong?"

  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE answer_explicit_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON answer_explicit_feedback
  FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "users_select_own" ON answer_explicit_feedback
  FOR SELECT USING (user_id = auth.uid());

-- ============================================================
-- LAYER 2b: SESSION-LEVEL FEEDBACK (post-prep survey)
-- ============================================================

CREATE TABLE session_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Confidence delta
  confidence_before SMALLINT CHECK (confidence_before BETWEEN 1 AND 10),
  confidence_after  SMALLINT CHECK (confidence_after  BETWEEN 1 AND 10),

  -- Product signal
  most_helpful_card  TEXT,  -- answer_type of most useful card
  least_helpful_card TEXT,  -- answer_type of least useful card
  would_recommend    BOOLEAN,

  -- PMF signal (Sean Ellis test)
  disappointment_without TEXT CHECK (disappointment_without IN (
    'very_disappointed', 'somewhat_disappointed', 'not_disappointed'
  )),

  what_else_would_help TEXT,

  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE session_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON session_feedback
  FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "users_select_own" ON session_feedback
  FOR SELECT USING (user_id = auth.uid());

-- ============================================================
-- EXTEND interview_reports (created in migration 009)
-- Add richer fields without dropping existing data.
-- ============================================================

ALTER TABLE interview_reports
  ADD COLUMN IF NOT EXISTS company_name_normalized TEXT,
  ADD COLUMN IF NOT EXISTS role_type               TEXT,
  ADD COLUMN IF NOT EXISTS interview_format        TEXT CHECK (interview_format IN (
    'phone', 'video', 'in_person', 'async'
  )),
  ADD COLUMN IF NOT EXISTS interviewer_title      TEXT,
  ADD COLUMN IF NOT EXISTS interviewer_seniority  TEXT CHECK (interviewer_seniority IN (
    'peer', 'manager', 'director', 'vp', 'c_level'
  )),
  ADD COLUMN IF NOT EXISTS total_stages_in_process  INTEGER,
  ADD COLUMN IF NOT EXISTS current_stage_number     INTEGER,
  ADD COLUMN IF NOT EXISTS days_since_application   INTEGER,
  ADD COLUMN IF NOT EXISTS outcome_updated_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS offer_base_salary        INTEGER,
  ADD COLUMN IF NOT EXISTS offer_ote                INTEGER,
  ADD COLUMN IF NOT EXISTS offer_currency           TEXT DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS advice_for_others        TEXT,
  ADD COLUMN IF NOT EXISTS is_anonymized            BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS anonymized_at            TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at               TIMESTAMPTZ DEFAULT now();

-- Widen outcome CHECK to include 'advanced' (009 had 5 values, now 6).
ALTER TABLE interview_reports
  DROP CONSTRAINT IF EXISTS interview_reports_outcome_check;
ALTER TABLE interview_reports
  ADD CONSTRAINT interview_reports_outcome_check CHECK (outcome IN (
    'advanced', 'offer', 'rejected', 'ghosted', 'withdrew', 'pending'
  ));

-- Backfill company_name_normalized from existing company_name rows.
UPDATE interview_reports
  SET company_name_normalized = lower(trim(company_name))
  WHERE company_name_normalized IS NULL;

-- Indexes (IF NOT EXISTS guards against 009's indexes on the same columns)
CREATE INDEX IF NOT EXISTS idx_reports_company   ON interview_reports(company_name_normalized);
CREATE INDEX IF NOT EXISTS idx_reports_role_type ON interview_reports(role_type);
CREATE INDEX IF NOT EXISTS idx_reports_outcome   ON interview_reports(outcome);

-- Auto-update updated_at on row changes.
CREATE TRIGGER interview_reports_updated_at
  BEFORE UPDATE ON interview_reports
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- LAYER 3: QUESTION INTELLIGENCE
-- ============================================================

CREATE TABLE interview_questions_reported (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES interview_reports(id) ON DELETE CASCADE,
  user_id   UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  question_text     TEXT NOT NULL,
  question_category TEXT CHECK (question_category IN (
    'behavioral', 'situational', 'technical', 'roleplay',
    'case_study', 'culture_fit', 'closing', 'curveball'
  )),

  interview_stage TEXT NOT NULL,
  was_expected    BOOLEAN,

  felt_prepared              BOOLEAN,
  answer_quality_self_rating SMALLINT CHECK (answer_quality_self_rating BETWEEN 1 AND 5),

  -- Training gold — only the submitter can read these columns (enforced by policy below)
  what_i_actually_said TEXT,
  what_i_wish_i_said   TEXT,

  matched_answer_type    TEXT,   -- maps to one of our AnswerType values
  our_answer_was_helpful BOOLEAN,

  is_verified        BOOLEAN DEFAULT false,
  verification_count INTEGER DEFAULT 1,

  -- Denormalized for aggregation queries without JOINs
  company_name_normalized TEXT NOT NULL,
  role_type               TEXT,

  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_questions_company  ON interview_questions_reported(company_name_normalized);
CREATE INDEX idx_questions_category ON interview_questions_reported(question_category);

ALTER TABLE interview_questions_reported ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON interview_questions_reported
  FOR ALL USING (auth.role() = 'service_role');
-- All authenticated users can read the question text (anonymized) but NOT the personal fields.
-- The personal fields (what_i_actually_said, what_i_wish_i_said) are returned by the API only
-- when user_id = auth.uid() — enforced at the API layer using the service role key.
CREATE POLICY "authenticated_read_questions" ON interview_questions_reported
  FOR SELECT USING (auth.role() = 'authenticated');

-- ============================================================
-- COMPANY PLAYBOOKS
-- ============================================================

CREATE TABLE company_playbooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name_normalized TEXT NOT NULL UNIQUE,
  company_display_name    TEXT NOT NULL,

  -- Aggregated process intelligence
  total_reports              INTEGER DEFAULT 0,
  avg_process_duration_days  NUMERIC(5,1),
  avg_difficulty             NUMERIC(3,2),
  positive_experience_pct    NUMERIC(5,2),
  offer_rate_pct             NUMERIC(5,2),

  -- Stage structure: [{stage, format, avg_duration, frequency_pct}, ...]
  typical_stages JSONB,

  -- Top questions per stage: {recruiter: [{question, frequency, category}], ...}
  top_questions_by_stage JSONB,

  -- Compensation intelligence
  salary_range_low  INTEGER,
  salary_range_high INTEGER,
  salary_currency   TEXT,
  avg_ote           INTEGER,

  -- Outcome correlation signals
  -- {high_correlation: [...], common_in_offers: [...], red_flags: [...]}
  success_signals JSONB,

  last_updated          TIMESTAMPTZ DEFAULT now(),
  report_threshold_met  BOOLEAN DEFAULT false, -- show only when total_reports >= 5
  confidence_level      TEXT CHECK (confidence_level IN ('low', 'medium', 'high')),
  -- low: 5–14 reports, medium: 15–49, high: 50+

  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_playbooks_company ON company_playbooks(company_name_normalized);

ALTER TABLE company_playbooks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON company_playbooks
  FOR ALL USING (auth.role() = 'service_role');
-- Playbooks are public intelligence — readable by all authenticated users.
CREATE POLICY "authenticated_read" ON company_playbooks
  FOR SELECT USING (auth.role() = 'authenticated');

-- ============================================================
-- PROMPT OPTIMIZATION TRACKING
-- ============================================================

CREATE TABLE prompt_quality_metrics (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  answer_type TEXT NOT NULL,
  week_start  DATE NOT NULL,

  total_generations          INTEGER,
  avg_explicit_rating        NUMERIC(3,2),
  edit_rate                  NUMERIC(5,4),  -- fraction of answers edited
  avg_edit_distance          NUMERIC(7,2),
  regeneration_rate          NUMERIC(5,4),  -- fraction regenerated
  copy_rate                  NUMERIC(5,4),  -- fraction copied
  avg_time_on_card_seconds   NUMERIC(7,2),
  avg_outcome_score          NUMERIC(3,2),
  -- 1=rejected, 2=ghosted, 3=advanced, 4=offer

  prompt_version TEXT,
  prompt_hash    TEXT,  -- hash of the prompt template for A/B comparison

  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(answer_type, week_start)
);

ALTER TABLE prompt_quality_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON prompt_quality_metrics
  FOR ALL USING (auth.role() = 'service_role');
