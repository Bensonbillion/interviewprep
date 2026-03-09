-- Custom prep questions: user-submitted questions with AI-generated answers
CREATE TABLE IF NOT EXISTS custom_prep_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  interview_stage TEXT,
  generated_answer TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_custom_questions_session ON custom_prep_questions(session_id);
CREATE INDEX idx_custom_questions_user ON custom_prep_questions(user_id);

ALTER TABLE custom_prep_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_questions_select" ON custom_prep_questions
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "own_questions_insert" ON custom_prep_questions
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "own_questions_update" ON custom_prep_questions
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "own_questions_delete" ON custom_prep_questions
  FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id);
