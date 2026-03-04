-- Migration 008: Voice Patterns

CREATE TABLE IF NOT EXISTS voice_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_name TEXT NOT NULL UNIQUE,
  pattern_type TEXT NOT NULL CHECK (pattern_type IN (
    'opener', 'transition', 'cognitive_marker', 'closer', 'recovery', 'emphasis', 'vulnerability'
  )),
  examples TEXT[] DEFAULT '{}',
  usage_context TEXT,
  frequency_guidance TEXT,
  bad_alternative TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE voice_patterns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin access only" ON voice_patterns
  FOR ALL USING (FALSE);

INSERT INTO voice_patterns (pattern_name, pattern_type, examples, usage_context, frequency_guidance, bad_alternative) VALUES

('conversational_hook', 'opener',
 ARRAY['So the short version is —', 'Yeah, so —', 'Honestly, the thing that —', 'This is actually a good one —', 'So basically what happened was —', 'That''s actually what got me into this —'],
 'Start of any answer. Vary per answer — never repeat the same opener across answers in the same session.',
 'One per answer, always the first words.',
 '"I am a results-driven professional who..." or "Throughout my career, I have..."'),

('thought_bridge', 'transition',
 ARRAY['and what I realized was —', 'which is actually why —', 'and that''s when it kind of clicked that —', 'so at that point I was like, okay —', 'and honestly that changed how I thought about —', 'but the thing that actually made the difference was —', 'which sounds small, but —'],
 'Between Layer 2 (context) and Layer 3 (actions), or between action steps within Layer 3. Signals movement from scene-setting to the actual story.',
 'One to two per answer.',
 '"Subsequently, I implemented..." or "This experience taught me that..."'),

('authentic_imperfection', 'vulnerability',
 ARRAY['I didn''t fully get it at first —', 'my first instinct was honestly wrong —', 'looking back I probably should have —', 'I''ll be real, the first attempt was rough —', 'I remember thinking, okay this is not going well —', 'which honestly wasn''t my strongest area at the time —'],
 'Once per behavioral answer. Place BEFORE the positive resolution — the contrast makes the win more credible and the narrative feel lived rather than constructed.',
 'Exactly one per behavioral/STAR answer.',
 'Omitting any failure or presenting an unrealistically smooth narrative — interviewers flag this as inauthentic immediately.'),

('natural_landing', 'closer',
 ARRAY['...and that''s basically what brought me here.', '...so yeah, that''s really what I''m looking to do more of.', '...which is a big part of why this role stood out to me.', '...and I haven''t looked back since.', '...so that''s kind of the foundation I''m building on.', '...and honestly that experience is what made me confident I could do this.'],
 'End of any answer. Must feel like a person landing a thought, not concluding an essay. Forward energy, not a thesis restatement.',
 'One per answer, always the final words.',
 '"And that is why I am confident I would be an excellent fit for this role." or "I believe this demonstrates my ability to..."'),

('mid_answer_correction', 'recovery',
 ARRAY['Actually no, let me back up —', 'Sorry, I should give you more context —', 'Wait, the better example is actually —', 'Let me rephrase that —', 'Actually that''s not quite what I mean —'],
 'When the answer needs to course-correct mid-stream. Signals real-time thinking and makes the answer feel unscripted rather than memorized. Use sparingly — once max per answer, and only when it genuinely serves the story.',
 'Zero or one per answer — never force it.',
 'Perfectly linear narrative with no self-correction — reads as memorized and rehearsed.')

ON CONFLICT (pattern_name) DO NOTHING;
