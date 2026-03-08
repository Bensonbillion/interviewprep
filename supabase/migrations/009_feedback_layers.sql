-- Layer 1: Page-level implicit events
CREATE TABLE session_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  answer_type TEXT,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'card_expanded', 'card_collapsed', 'time_on_card',
    'regen_consecutive', 'edit_started', 'edit_saved'
  )),
  duration_ms INTEGER,          -- time_on_card: ms visible before exit
  edit_distance INTEGER,        -- edit_saved: word-level changed count
  words_changed_pct INTEGER,    -- edit_saved: 0–100
  regen_sequence INTEGER,       -- regen_consecutive: count at time of event
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX ON session_events (session_id);
CREATE INDEX ON session_events (event_type, created_at DESC);
ALTER TABLE session_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON session_events FOR ALL USING (auth.role() = 'service_role');

-- Layer 2: Voice samples
CREATE TABLE answer_voice_samples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  answer_type TEXT NOT NULL,
  ai_content_snapshot TEXT NOT NULL,
  user_version TEXT NOT NULL,
  stage TEXT,
  role_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX ON answer_voice_samples (answer_type, created_at DESC);
ALTER TABLE answer_voice_samples ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON answer_voice_samples FOR ALL USING (auth.role() = 'service_role');

-- Layer 2: Post-session confidence scores
CREATE TABLE session_confidence_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  stage TEXT NOT NULL,
  company_name TEXT,
  score INTEGER NOT NULL CHECK (score >= 1 AND score <= 5),
  blocker_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE session_confidence_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON session_confidence_scores FOR ALL USING (auth.role() = 'service_role');

-- Layer 3: Post-interview intelligence reports
CREATE TABLE interview_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prep_session_id TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  company_name TEXT NOT NULL,
  role_title TEXT NOT NULL,
  stage TEXT NOT NULL,
  interview_date DATE,
  outcome TEXT CHECK (outcome IN ('offer', 'rejected', 'pending', 'withdrew', 'ghosted')),
  duration_minutes INTEGER,
  num_interviewers INTEGER,
  interviewer_roles TEXT[] DEFAULT ARRAY[]::TEXT[],
  questions_asked JSONB DEFAULT '[]',
  included_roleplay BOOLEAN DEFAULT FALSE,
  roleplay_scenario TEXT,
  difficulty INTEGER CHECK (difficulty >= 1 AND difficulty <= 5),
  experience TEXT CHECK (experience IN ('positive', 'neutral', 'negative')),
  notes TEXT,
  processed_for_playbook BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX ON interview_reports (company_name, stage);
CREATE INDEX ON interview_reports (outcome, created_at DESC);
ALTER TABLE interview_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON interview_reports FOR ALL USING (auth.role() = 'service_role');
