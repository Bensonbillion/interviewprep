-- ============================================================
-- Migration 004: Knowledge Bank V2 + Interviewer Profiles
-- Run this in Supabase SQL Editor
-- ============================================================

-- ============================================================
-- QUESTION BANK
-- 150+ questions with hidden evaluation criteria
-- ============================================================

CREATE TABLE IF NOT EXISTS question_bank (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  question_text TEXT NOT NULL,
  answer_type TEXT NOT NULL, -- maps to AnswerType enum
  stage TEXT CHECK (stage IN ('recruiter', 'hiring_manager', 'role_play', 'panel', 'all')),
  role_type TEXT CHECK (role_type IN ('sdr_bdr', 'account_executive', 'account_manager_csm', 'other_sales', 'all')),
  hidden_evaluation TEXT NOT NULL, -- What the interviewer is ACTUALLY evaluating (not what they say)
  common_mistakes TEXT[] DEFAULT '{}', -- Top mistakes candidates make
  frequency_score INTEGER DEFAULT 5 CHECK (frequency_score >= 1 AND frequency_score <= 10), -- 10 = asked in almost every interview
  framework_hint TEXT, -- Recommended answer framework (STAR, SPIN, direct, etc.)
  follow_up_questions TEXT[] DEFAULT '{}', -- Likely follow-up questions
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE question_bank ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin access only" ON question_bank
  FOR ALL USING (FALSE);

CREATE INDEX IF NOT EXISTS idx_question_bank_stage_role
  ON question_bank (stage, role_type)
  WHERE is_active = TRUE;

-- ============================================================
-- INTERVIEWER PROFILES
-- Stores researched dossiers for specific interviewers
-- ============================================================

CREATE TABLE IF NOT EXISTS interviewer_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL, -- links to prep session (sessionStorage key)
  name TEXT NOT NULL,
  linkedin_url TEXT,
  role_title TEXT,
  company_name TEXT,
  raw_scraped TEXT, -- raw content from LinkedIn/web scrape
  dossier JSONB, -- synthesized dossier from Claude
  -- dossier schema: { background, likelyFocusAreas[], suggestedTopicsToReference[], likelyQuestions[], conversationalStyle }
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE interviewer_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only" ON interviewer_profiles
  FOR ALL USING (FALSE);

CREATE INDEX IF NOT EXISTS idx_interviewer_profiles_session
  ON interviewer_profiles (session_id);

-- ============================================================
-- METHODOLOGY REFERENCES
-- Sales methodologies referenced in coaching content
-- ============================================================

CREATE TABLE IF NOT EXISTS methodology_references (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE, -- e.g. "MEDDIC", "SPIN Selling", "Challenger Sale"
  abbreviation TEXT, -- e.g. "MEDDIC", "SPIN"
  category TEXT CHECK (category IN (
    'qualification', 'discovery', 'closing',
    'objection_handling', 'prospecting', 'account_management'
  )),
  summary TEXT NOT NULL, -- 2-3 sentence explanation
  key_principles TEXT[] DEFAULT '{}', -- Core components/steps
  best_used_for TEXT, -- When to reference this methodology
  common_interview_context TEXT, -- How it shows up in interviews
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE methodology_references ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin access only" ON methodology_references
  FOR ALL USING (FALSE);

-- ============================================================
-- SEED: Core question bank entries
-- ============================================================

INSERT INTO question_bank (question_text, answer_type, stage, role_type, hidden_evaluation, common_mistakes, frequency_score, framework_hint, follow_up_questions) VALUES

-- RECRUITER SCREEN QUESTIONS
('Tell me about yourself.', 'tell_me_about_yourself', 'recruiter', 'all',
 'Can you tell a coherent story in 90 seconds? Are you a fit for this role? Do you have basic communication skills?',
 ARRAY['Going too far back in career history', 'Reading from a script', 'Not connecting to this specific role', 'Running over 3 minutes'],
 10, 'Chronological narrative ending with bridge to this role',
 ARRAY['What drew you to sales specifically?', 'Why are you leaving your current role?']),

('Why do you want to work in sales?', 'why_sales', 'recruiter', 'all',
 'Is this person choosing sales or defaulting to it? Do they understand what the job actually involves? Will they stick around past 6 months?',
 ARRAY['Generic answers about "loving people"', 'Not having a specific moment or story', 'Mentioning money as primary motivation in early rounds', 'No mention of resilience/rejection handling'],
 9, 'Specific moment or realization + forward-looking energy',
 ARRAY['What do you think the hardest part of sales is?', 'Have you ever done anything sales-adjacent?']),

('Why are you interested in this company specifically?', 'why_this_company', 'recruiter', 'all',
 'Did they do any research? Can they name something specific? Are they just spraying applications?',
 ARRAY['Generic answers (great culture, growth opportunities)', 'Mentioning things from Wikipedia', 'Not knowing the product', 'Praising the company too effusively'],
 9, 'Specific research point + personal connection to what they build',
 ARRAY['What do you know about our product?', 'Who are our competitors?']),

('What are your compensation expectations?', 'comp_expectations', 'recruiter', 'all',
 'Are they in our budget? Do they understand sales comp structure? Are they desperate or market-aware?',
 ARRAY['Giving a single number instead of a range', 'Undervaluing themselves', 'Not mentioning OTE structure', 'Being defensive or apologetic'],
 8, 'Range + OTE awareness + openness to discuss full package',
 ARRAY['Are you comfortable with a commission-heavy comp structure?', 'What is your current OTE?']),

('Tell me about a time you were persistent to achieve something.', 'behavioral_star', 'recruiter', 'all',
 'Do they have grit? Can they tell a specific story with a real outcome? Do they understand why persistence matters in sales?',
 ARRAY['Story with no concrete outcome or metric', 'Story from too long ago or irrelevant context', 'Not explaining what persistence specifically looked like', 'Confusing stubbornness with strategic persistence'],
 8, 'STAR format with emphasis on specific actions taken during persistence',
 ARRAY['What would you have done differently?', 'How did you maintain motivation during that period?']),

-- HIRING MANAGER QUESTIONS
('Walk me through your largest/most complex deal.', 'behavioral_star', 'hiring_manager', 'account_executive',
 'Can they actually run an enterprise sales process? Do they understand multi-threading, stakeholder management, deal structure? Is their deal size real?',
 ARRAY['No deal size or vague numbers', 'Not mentioning multiple stakeholders', 'Linear single-contact story in a complex deal', 'No mention of how they won against competition'],
 10, 'STAR with deal size, stakeholders, timeline, obstacles, and close',
 ARRAY['Who was the decision-maker? How did you identify them?', 'What almost killed this deal?', 'How did you handle procurement?']),

('Tell me about a deal you lost. What happened?', 'behavioral_star', 'hiring_manager', 'account_executive',
 'Self-awareness, ability to process failure, what they changed afterward. The change is more important than the loss.',
 ARRAY['Blaming the prospect or external factors', 'Not having a loss ready (red flag)', 'Story with no learning or behavior change', 'Choosing a loss that reveals a fatal flaw'],
 9, 'STAR with honest diagnosis + specific behavior change after',
 ARRAY['What did you change after that loss?', 'Have you applied that lesson since?']),

('Tell me about a time you received hard feedback. How did you respond?', 'behavioral_star', 'hiring_manager', 'all',
 'Coachability. This is the #1 thing managers assess. Do they get defensive? Do they implement feedback or just acknowledge it?',
 ARRAY['Choosing feedback that was not actually hard', 'Defensive framing ("but I thought...")', 'No specific implementation of the feedback', 'Feedback from too long ago with no follow-through shown'],
 9, 'STAR with emphasis on exact changes made after receiving feedback',
 ARRAY['Would you say you are easy to manage?', 'How do you prefer to receive feedback?']),

('What does your sales process look like?', 'behavioral_star', 'hiring_manager', 'all',
 'Do they have a repeatable process? Can they articulate methodology? Are they a random hunter or systematic seller?',
 ARRAY['Too vague (I prospect, I qualify, I close)', 'Not mentioning qualification criteria', 'No methodology name or framework', 'Cannot explain how they prioritize leads'],
 8, 'Step-by-step with methodology name + qualification criteria',
 ARRAY['What tools do you use?', 'How do you prioritize your pipeline?', 'How do you handle ghosting?']),

('What is your quota attainment history?', 'behavioral_star', 'hiring_manager', 'all',
 'Can they recall specific numbers? Are they honest? Do they contextualize misses? Are they a consistent performer?',
 ARRAY['Vague ranges without specifics', 'Not contextualizing misses with what they learned', 'Rounding to convenient numbers (everyone hit 100%)'],
 9, 'Specific % for each year + context for any misses',
 ARRAY['Tell me about a quarter you missed. What happened?', 'How do you forecast?']),

-- ROLE PLAY / ASSESSMENT QUESTIONS
('How would you research a prospect before a cold call?', 'behavioral_star', 'role_play', 'all',
 'Do they have a systematic research process? Do they personalize, or blast? Can they name specific things to look for?',
 ARRAY['Generic (LinkedIn, website)', 'Not mentioning what they do with the research', 'No mention of timing or triggers'],
 7, 'Specific sources + what they look for + how it changes their approach',
 ARRAY['Give me an example of how this research changed your opener.']),

('How do you handle objections?', 'objection_response', 'role_play', 'all',
 'Do they know the formula? (Acknowledge → Reframe → Ask a question) Do they argue? Do they freeze?',
 ARRAY['Arguing against the objection', 'Ignoring the objection and pitching harder', 'Giving up at the first "no"', 'Treating all objections the same'],
 9, 'Acknowledge → Reframe → Re-engage with a question',
 ARRAY['Show me how you would handle "We already have a solution."']),

-- PANEL / FINAL QUESTIONS
('Where do you see yourself in 5 years?', 'behavioral_star', 'panel', 'all',
 'Ambition + company fit + realistic self-awareness. Will they leave in 6 months for management? Are they a flight risk?',
 ARRAY['Saying you want to be in management (scares sales managers)', 'Too vague ("growing in the company")', 'Not connecting to this role as a genuine step'],
 7, 'Ambition + realistic path + connected to this company specifically',
 ARRAY['Do you see yourself on an individual contributor or management track?']),

('What questions do you have for us?', 'questions_to_ask', 'panel', 'all',
 'Have they done research? Are they thinking about fit or just getting the job? Do they ask smart questions that signal sales thinking?',
 ARRAY['No questions or "I think you covered everything"', 'Questions that are too basic (salary, benefits)', 'Questions that reveal lack of research', 'Too many questions (pick 2-3 good ones)'],
 10, 'Research-backed question + team/culture question + forward-looking question',
 ARRAY[]::TEXT[])

ON CONFLICT DO NOTHING;

-- ============================================================
-- SEED: Core methodology references
-- ============================================================

INSERT INTO methodology_references (name, abbreviation, category, summary, key_principles, best_used_for, common_interview_context) VALUES

('MEDDIC', 'MEDDIC', 'qualification',
 'A qualification framework used in enterprise sales to rigorously assess deal viability. Originally developed at PTC, now standard at most B2B SaaS companies.',
 ARRAY['Metrics: quantify the economic impact', 'Economic Buyer: find the person with budget authority', 'Decision Criteria: understand how they evaluate', 'Decision Process: map the buying journey', 'Identify Pain: the compelling event that drives urgency', 'Champion: find your internal advocate'],
 'Enterprise B2B deals with multiple stakeholders and long sales cycles.',
 'HMs ask "What is your qualification process?" — name MEDDIC and explain each component with an example.'),

('SPIN Selling', 'SPIN', 'discovery',
 'A research-backed discovery methodology by Neil Rackham. Focuses on asking Situation, Problem, Implication, and Need-Payoff questions to surface and develop buyer pain.',
 ARRAY['Situation: establish context', 'Problem: surface explicit problems', 'Implication: develop the consequences of the problem', 'Need-Payoff: show the value of solving it'],
 'Discovery calls, especially in complex or high-value deals where you need to develop pain rather than just identify it.',
 'Role plays and HM rounds — shows you understand discovery rather than feature-dumping.'),

('Challenger Sale', NULL, 'discovery',
 'A sales methodology by Mathew Dixon and Brent Adamson. The most effective reps teach prospects something new about their business, tailor the pitch to the buyer, and take control of the sale.',
 ARRAY['Teach: provide a unique insight the buyer did not know', 'Tailor: customize the message to different stakeholders', 'Take Control: be willing to push back and maintain control of the process'],
 'Consultative enterprise selling where the rep brings genuine market or domain expertise.',
 'Panel rounds and executive interviews — signals you can sell to C-level buyers.'),

('Sandler Selling System', 'Sandler', 'qualification',
 'A sales methodology focused on equal business stature between buyer and seller. Emphasizes upfront contracting, pain identification, and letting the buyer sell themselves.',
 ARRAY['Bonding and Rapport', 'Up-Front Contract (setting expectations)', 'Pain Identification', 'Budget Qualification', 'Decision Process Mapping', 'Fulfillment (the pitch)', 'Post-Sell (preventing buyer remorse)'],
 'High-volume sales environments and deals where prospects tend to string reps along.',
 'SDR roles and HM rounds — signals you understand structured qualification.'),

('BANT', 'BANT', 'qualification',
 'One of the oldest qualification frameworks, developed at IBM. Budget, Authority, Need, Timeline. Often criticized as too rigid but still referenced widely.',
 ARRAY['Budget: do they have money?', 'Authority: are you talking to the right person?', 'Need: do they have a genuine problem?', 'Timeline: when do they need to solve it?'],
 'High-volume SDR qualification and early-stage opportunity assessment.',
 'Recruiter and HM screens — shows you can qualify quickly. Pair with MEDDIC for enterprise context.')

ON CONFLICT (name) DO NOTHING;
