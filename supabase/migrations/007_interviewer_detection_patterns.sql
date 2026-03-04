-- Migration 007: Interviewer Detection Patterns

CREATE TABLE IF NOT EXISTS interviewer_detection_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  technique_name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  example_questions TEXT[] DEFAULT '{}',
  what_interviewer_is_testing TEXT,
  green_flag_response TEXT,
  red_flag_response TEXT,
  coaching_note TEXT,
  interview_stage TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE interviewer_detection_patterns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin access only" ON interviewer_detection_patterns
  FOR ALL USING (FALSE);

INSERT INTO interviewer_detection_patterns (technique_name, description, example_questions, what_interviewer_is_testing, green_flag_response, red_flag_response, coaching_note, interview_stage) VALUES

('detail_drill',
 'Interviewer asks progressively more specific questions about a single claim to test if the experience is genuine.',
 ARRAY['Can you break that down for me?', 'What were the specific numbers month over month?', 'Walk me through exactly what you did on day one.', 'Who else was involved and what was your specific role?'],
 'Genuine experiences have nested details — ask about one aspect and adjacent details naturally surface. Fabricated stories have flat detail structures that collapse under probing.',
 'Candidate produces MORE detail when probed, recalls adjacent context, can shift between time frames fluidly.',
 'Candidate repeats the same summary, deflects to a different story, says "I don''t remember" on specifics they should know, contradicts earlier details.',
 'Your answer is built with nested details so you can handle this. When they ask "tell me more," zoom into Layer 3 of your answer — the specific actions, the tools, the decision point. Don''t restart the story.',
 ARRAY['recruiter', 'hiring_manager', 'panel']),

('ownership_test',
 'Interviewer probes whether the candidate personally did the work or was merely present.',
 ARRAY['What was YOUR specific contribution versus the team''s?', 'If I called your manager, what would they say your role was?', 'Who made the final decision?', 'What would have happened if you hadn''t been involved?'],
 'First-person pronoun usage, specific vs vague action descriptions, ability to delineate personal contribution from team output.',
 'Clear "I" statements with specific actions. Can articulate exactly what they did vs others.',
 'Shifts to "we" language, vague about personal role, can''t specify their unique contribution.',
 'Lead with "I" when describing actions. It''s okay to credit the team for context, but YOUR actions must be crystal clear. "I built the sequences. My colleague handled the data cleanup. Together that gave us..."',
 ARRAY['hiring_manager', 'panel']),

('coachability_test',
 'Interviewer gives direct feedback or correction mid-interview and observes reaction. Roberge''s #1 predictor of sales success.',
 ARRAY['That answer was too long. Can you give me the 30-second version?', 'I don''t think you answered my question. Let me ask it differently.', 'Your approach there is interesting but here''s how we think about it differently...', 'After roleplay: Here''s what I''d change. Now do it again.'],
 'Can this person absorb feedback without defensiveness and immediately adjust behavior? This is the #1 predictor of SDR/BDR success per HubSpot data.',
 'Pauses. Acknowledges. Adjusts. "That''s fair — let me try that again." Visibly implements the feedback in the re-do. Doesn''t need to be perfect, needs to show EFFORT.',
 'Defensive ("Well what I meant was..."). Argues with the feedback. Redoes it exactly the same way. Gets visibly flustered and shuts down.',
 'If they give you feedback mid-interview, this is a TEST. Don''t panic. Say: "That''s a good point — let me adjust." Then TRY. Effort beats perfection. Roberge says only 5 out of 1,000+ candidates crushed the re-do. They all became rock stars.',
 ARRAY['role_play', 'hiring_manager', 'panel'])

ON CONFLICT (technique_name) DO NOTHING;
