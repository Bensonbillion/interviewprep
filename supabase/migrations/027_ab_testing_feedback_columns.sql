-- Add A/B testing metrics columns to answer_explicit_feedback
ALTER TABLE answer_explicit_feedback
  ADD COLUMN IF NOT EXISTS too_robotic BOOLEAN,
  ADD COLUMN IF NOT EXISTS easy_to_say_out_loud SMALLINT CHECK (easy_to_say_out_loud BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS quick_tag TEXT;

COMMENT ON COLUMN answer_explicit_feedback.too_robotic IS
  'User flagged this answer as sounding too robotic/AI-generated.';
COMMENT ON COLUMN answer_explicit_feedback.easy_to_say_out_loud IS
  'User rating 1-5 of how easy this answer is to say out loud.';
COMMENT ON COLUMN answer_explicit_feedback.quick_tag IS
  'One-tap quick tag: sounds_like_me, too_robotic, too_long, too_generic, missing_specifics.';
