-- Migration 005: Question Bank — Probe Depth Columns

ALTER TABLE question_bank
  ADD COLUMN IF NOT EXISTS likely_followups TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS probe_depth_questions JSONB,
  ADD COLUMN IF NOT EXISTS detection_technique TEXT
    CHECK (detection_technique IN (
      'detail_drill',
      'obstacle_probe',
      'learning_loop',
      'reverse_order',
      'ownership_test',
      'coachability_test'
    ));

UPDATE question_bank SET
  likely_followups = ARRAY['Tell me more about your time at [most recent company].', 'Why did you leave [company]?', 'What specifically drew you to sales?'],
  probe_depth_questions = jsonb_build_object('level_1', 'Tell me more about that role.', 'level_2', 'What were your actual numbers - quota, attainment?', 'level_3', 'Walk me through what a typical day looked like.', 'trap_question', 'If I called your manager from that role, what would they say about you?'),
  detection_technique = 'detail_drill'
WHERE answer_type = 'tell_me_about_yourself';

UPDATE question_bank SET
  likely_followups = ARRAY['What do you think the hardest part of sales is?', 'Was there ever a moment you doubted it was the right path?', 'What specifically about that moment clicked?'],
  probe_depth_questions = jsonb_build_object('level_1', 'Tell me more about that experience.', 'level_2', 'What emotion did you feel in that moment specifically?', 'level_3', 'How did that change the way you approach your pipeline?', 'trap_question', 'Give me an example of a time you wanted to quit.'),
  detection_technique = 'learning_loop'
WHERE answer_type = 'why_sales';

UPDATE question_bank SET
  likely_followups = ARRAY['What do you know about our competitors?', 'Who do you think our ideal customer is?', 'Have you used the product?'],
  probe_depth_questions = jsonb_build_object('level_1', 'What specifically caught your attention about what we do?', 'level_2', 'How did you find out about us - what was your research process?', 'level_3', 'If you were selling our product, what objection do you think you''d hear most?', 'trap_question', 'What would make you turn down this offer if you got it?'),
  detection_technique = 'detail_drill'
WHERE answer_type = 'why_this_company';

UPDATE question_bank SET
  likely_followups = ARRAY['Walk me through that step by step.', 'What was the hardest part?', 'What would you do differently?', 'What specifically was your role versus the team''s?'],
  probe_depth_questions = jsonb_build_object('level_1', 'Walk me through that in more detail.', 'level_2', 'What specifically did YOU do versus what the team did?', 'level_3', 'What was going through your head when you made that decision?', 'trap_question', 'What would your manager say was the actual reason that worked?'),
  detection_technique = 'ownership_test'
WHERE answer_type = 'behavioral_star';

UPDATE question_bank SET
  likely_followups = ARRAY['Is that base or OTE?', 'Is that flexible?', 'What are you making now?'],
  probe_depth_questions = jsonb_build_object('level_1', 'What are you making in your current role?', 'level_2', 'If we came in below that range, would you still consider it?', 'level_3', 'What matters more to you - base or upside?', 'trap_question', 'We''re at the bottom of that range. Is that a dealbreaker?'),
  detection_technique = 'detail_drill'
WHERE answer_type = 'comp_expectations';
