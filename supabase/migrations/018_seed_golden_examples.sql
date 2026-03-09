-- Migration 018: Seed golden_examples with real interview answers
-- Sources: Bravado, Glassdoor, SalesTrax, Orum, Vendition, Career Contessa, LinkedIn, Springboard

-- ── 1. Add background_type column ────────────────────────────────────────────
ALTER TABLE golden_examples
  ADD COLUMN IF NOT EXISTS background_type TEXT;

-- ── 2. Update match_golden_examples to fallback to exact key matching ────────
-- Seeded examples have no embedding yet. This ensures they are returned
-- via direct question_key matching when no embedding-based matches exist.
CREATE OR REPLACE FUNCTION match_golden_examples(
  query_embedding VECTOR(1536),
  match_count INTEGER DEFAULT 3,
  filter_question_key TEXT DEFAULT NULL,
  filter_role TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  question_text TEXT,
  answer_text TEXT,
  framework TEXT,
  quality_score DECIMAL,
  authenticity_markers TEXT[],
  red_flag_version TEXT,
  red_flag_why TEXT,
  similarity FLOAT
) AS $$
BEGIN
  RETURN QUERY
  (
    -- Primary: embedding-based similarity matches
    SELECT
      ge.id,
      ge.question_text,
      ge.answer_text,
      ge.framework,
      ge.quality_score,
      ge.authenticity_markers,
      ge.red_flag_version,
      ge.red_flag_why,
      1 - (ge.embedding <=> query_embedding) AS similarity
    FROM golden_examples ge
    WHERE ge.is_active = TRUE
      AND ge.quality_score >= 8
      AND ge.embedding IS NOT NULL
      AND (filter_question_key IS NULL OR ge.question_key = filter_question_key)
      AND (filter_role IS NULL OR ge.role_type = filter_role OR ge.role_type IS NULL)
    ORDER BY ge.embedding <=> query_embedding
    LIMIT match_count
  )
  UNION ALL
  (
    -- Fallback: exact question_key matches without embeddings
    -- Only used when seeded examples haven't been embedded yet
    SELECT
      ge.id,
      ge.question_text,
      ge.answer_text,
      ge.framework,
      ge.quality_score,
      ge.authenticity_markers,
      ge.red_flag_version,
      ge.red_flag_why,
      0.75::FLOAT AS similarity
    FROM golden_examples ge
    WHERE ge.is_active = TRUE
      AND ge.quality_score >= 8
      AND ge.embedding IS NULL
      AND filter_question_key IS NOT NULL
      AND ge.question_key = filter_question_key
      AND (filter_role IS NULL OR ge.role_type = filter_role OR ge.role_type IS NULL)
    ORDER BY ge.quality_score DESC, ge.created_at DESC
    LIMIT match_count
  )
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql;

-- ── 3. Seed golden examples ─────────────────────────────────────────────────

-- ─── TELL ME ABOUT YOURSELF ─────────────────────────────────────────────────

INSERT INTO golden_examples (
  question_key, role_type, round_type, background_type,
  question_text, answer_text, framework, quality_score,
  notes, source,
  authenticity_markers, red_flag_version, red_flag_why
) VALUES

-- 1. Data science → SDR (career switcher, entry)
(
  'tell_me_about_yourself', 'sdr_bdr', 'recruiter', 'career_switcher',
  'Tell me about yourself.',
  'I have a background in statistics and data science, communications, and business. I love to learn and challenge myself and help people find solutions to their problems. After doing some research I finally found a career that combines all of my skillsets — my need to grow and my interest in tech. Sales forces you to be a better version of the self you were yesterday. What else would you like to know about me?',
  'narrative', 9,
  'Connects diverse non-sales background to sales traits. Ends with engagement question — instinctive sales move. Under 60 seconds.',
  'Quizlet SDR/BDR flashcard set — real candidate prep',
  ARRAY['ends with question back', 'specific about background', 'authentic motivation', 'no buzzwords'],
  'I am passionate about sales and believe my diverse background makes me a great fit for this role. I am a hard worker and a quick learner who thrives in fast-paced environments.',
  'Generic buzzwords (passionate, hard worker, thrives). No specific details. Sounds like every other candidate. No engagement question back.'
),

-- 2. Nonprofit fundraiser → sales (career switcher, entry)
(
  'tell_me_about_yourself', 'sdr_bdr', 'recruiter', 'career_switcher',
  'Tell me about yourself.',
  'When I was a kid, I used to go through the real estate section of the paper every Sunday. In college, I had an internship with a realtor. Most recently, I enrolled in design programs to learn CAD so I could mock up interior design ideas for my friends. In my current job at a nonprofit, Ive grown our donor database by 8% and created our first online fundraising event — a complete pivot from the in-person event weve done for 15 years — and were happy we raised $100,000 more than our original goal. Between my appreciation for design and my knack for building relationships, I think Im a great fit here.',
  'narrative', 10,
  'Personal thread running through entire life. Specific metrics ($100K over goal, 8% growth). Shows initiative with the pivot to online.',
  'Career Contessa — real candidate example',
  ARRAY['childhood origin story', 'specific dollar metrics', 'career-spanning thread', 'natural connector to role'],
  'I worked in nonprofit fundraising for two years. I raised money and organized events. Now I want to move into sales because I think it would be a good career move for me.',
  'No specifics, no metrics, no personality. Doesnt explain WHY sales. Sounds like running away from nonprofits, not running toward sales.'
),

-- 3. Experienced SDR with pipeline metrics (mid-level)
(
  'tell_me_about_yourself', 'sdr_bdr', 'recruiter', 'experienced_sales',
  'Tell me about yourself.',
  'Yeah, so Im a sales development pro — spent the last five years building pipeline in SaaS, mostly in the mid-market space. I was at Brandwatch first, then moved to Samsara, and Ive just been promoted to Senior SDR there. The core of what I do is outbound prospecting and discovery — I run MEDDIC-based qualification, build vertical-focused sequences, and Ive consistently hit 100%+ on quota. Last year alone, I sourced about $7M in qualified pipeline. Whats drawing me to your company specifically is the vertical focus — water utilities is a space where the problem is really acute, and I think theres huge upside in owning that ICP deeply rather than chasing everything.',
  'narrative', 10,
  'Specific metrics ($7M pipeline). Names methodologies (MEDDIC). Explains lateral move logic. Shows company research.',
  'SalesTrax — real SDR answer structure',
  ARRAY['dollar pipeline number', 'methodology name drop', 'explains why moving', 'company-specific pull reason'],
  'I have five years of SDR experience in SaaS. I consistently hit quota and I am looking for a new challenge where I can grow my career.',
  'No numbers, no specifics, no reason for THIS company. Every SDR could say this.'
),

-- 4. ABM/ABX → SDR, hiring manager round (mid-level)
(
  'tell_me_about_yourself', 'sdr_bdr', 'hiring_manager', 'experienced_sales',
  'Tell me about yourself.',
  'So the turning point for me was honestly about two years ago at BroadBridge. I was running ABM/ABX, doing all the research — building the outreach, building the messaging. But what excited me wasnt the marketing side. It was when I started getting prospects on the phone. I was figuring out the funnel and the nurturing process, mapping the stakeholders, building the case alongside the AEs. And I realized — this is what I want to do, this is the part I am the best at. Which is exactly why Im drawn to this kind of role where the motion actually matters and I can build something repeatable.',
  'narrative', 10,
  'Specific turning point moment. Honest about what excited them vs what didnt. Connects discovery to the role. Feels like a real person talking.',
  'Real Klir prep session output — improved version',
  ARRAY['specific moment of realization', 'honest about preference', 'shows self-awareness', 'natural speech patterns'],
  'Throughout my career, I have demonstrated a strong ability to prospect and qualify leads. I believe my experience in account-based marketing gives me a unique perspective that I can leverage in this role.',
  'Starts with Throughout my career. Uses leverage. No specific moment. Reads like a LinkedIn summary, not a human talking.'
),

-- 5. SDR → AE transition (mid-level)
(
  'tell_me_about_yourself', 'sdr_bdr', 'recruiter', 'experienced_sales',
  'Tell me about yourself.',
  'Although I really enjoy my work as an SDR, Id like to dig deeper down the sales funnel and start actually closing deals. The current position has given me the opportunity to master my communication, listening, and negotiation skills. After two years, Im ready for a more challenging and dynamic role that requires bringing new business and revenue to the company.',
  'narrative', 9,
  'Present-past-future structure. Growth mindset without badmouthing current role. Directly connects current skills to desired role.',
  'BigInterview — real candidate example',
  ARRAY['present-past-future structure', 'growth mindset', 'no badmouthing current role', 'connects skills to new role'],
  'I want to be an AE because the SDR role is boring and I want to make more money.',
  'Badmouths current role. Motivation is purely financial. No skill connection.'
);

-- ─── WHY SALES ──────────────────────────────────────────────────────────────

INSERT INTO golden_examples (
  question_key, role_type, round_type, background_type,
  question_text, answer_text, framework, quality_score,
  notes, source,
  authenticity_markers, red_flag_version, red_flag_why
) VALUES

-- 6. Finance major discovers he's a relationship builder
(
  'why_sales', 'sdr_bdr', 'recruiter', 'career_switcher',
  'Why sales?',
  'I spent a long time in college convinced I was going to be in finance. Its where all my friends were going. But every job description I read bored me to tears, and Id find myself walking around the library chatting with friends instead, or taking a call with a friend from home to pass the time. Im not sure when it happened exactly, but suddenly it dawned on me that I have a knack for relationships, and get great pleasure from maintaining and growing them.',
  'narrative', 10,
  'Honest moment of self-discovery. Not a polished pitch — feels like a real person figuring things out. Contrasts what they thought they wanted vs what they actually enjoyed.',
  'SalesTrax — real SDR blog post',
  ARRAY['honest self-discovery', 'specific setting (library)', 'contrast structure', 'natural uncertainty'],
  'I am passionate about sales because I love connecting with people and helping them solve problems. I have always been a natural communicator and I thrive on the energy of closing deals.',
  'Every single buzzword. No story. No specific moment. Could not be more generic.'
),

-- 7. Military veteran → SDR (82nd Airborne)
(
  'why_sales', 'sdr_bdr', 'recruiter', 'career_switcher',
  'Why sales?',
  'Even though I felt unprepared and not yet ready to take on this task, I did what I had done my entire military career and rose to the occasion. During my internship, I discovered the SDR role aligned with my passion for teaching, speaking, coaching, and working with people. The discipline and mission focus I built in the 82nd Airborne translates directly — every day is a new objective.',
  'narrative', 9,
  'Military background framed as sales preparation, not as something to overcome. Specific unit mentioned (82nd Airborne). Multiple connection points.',
  'Vendition — R.W. Hairston 82nd Airborne profile',
  ARRAY['specific unit/role', 'honest about feeling unprepared', 'multiple skill connections', 'mission language'],
  'My military experience taught me discipline and leadership which I believe will serve me well in a sales career.',
  'Too generic. Every military-to-sales candidate says this exact line. No specific story, no unit, no moment.'
),

-- 8. Customer service → tech sales via bootcamp
(
  'why_sales', 'sdr_bdr', 'recruiter', 'career_switcher',
  'Why sales?',
  'Ive been passionate about technology ever since I got my first computer. Ive also worked in customer service for several years, which taught me a lot about the sales process and building relationships with customers. This year, I realized I could combine my passion for tech and customer service experience in a tech sales role — and graduated from a tech sales bootcamp to solidify my skills.',
  'narrative', 9,
  'Two clear threads combining. Shows initiative (bootcamp investment). Specific timing.',
  'Springboard — SDR interview guide',
  ARRAY['two threads combining', 'bootcamp investment', 'specific realization timing'],
  'I want to get into sales because I heard the money is good and there is a lot of opportunity for growth.',
  'Honest but wrong framing. Money should not be the stated primary driver in an interview. No personal connection to the work.'
),

-- 9. Restaurant/hospitality → SaaS sales
(
  'why_sales', 'sdr_bdr', 'recruiter', 'career_switcher',
  'Why sales?',
  'I spent 10 years as a server and manager in top-tier steakhouses. My responsibilities included lots of hands-on time programming and training employees on various POS systems. I realized that I was already selling every night — reading customers, making recommendations, handling objections about the wine list — and I wanted to do that in a space where the ceiling was higher.',
  'narrative', 9,
  'Drew direct line between industry domain expertise and sales skills. Turned hospitality into credential not gap. Specific role details.',
  'QuotaPath — career switcher examples',
  ARRAY['specific industry experience', 'reframes non-sales as sales', 'concrete examples (POS, wine list)', 'ceiling metaphor'],
  'I worked in restaurants for a long time and now I want a real career in sales.',
  'Dismisses restaurant work as not real. No connection between hospitality skills and sales. Insulting to their own experience.'
);

-- ─── WHY THIS COMPANY ───────────────────────────────────────────────────────

INSERT INTO golden_examples (
  question_key, role_type, round_type, background_type,
  question_text, answer_text, framework, quality_score,
  notes, source,
  authenticity_markers, red_flag_version, red_flag_why
) VALUES

-- 10. CEO eye-roll recovery — simplify the pitch
(
  'why_this_company', 'sdr_bdr', 'hiring_manager', NULL,
  'Why do you want to work at this company?',
  'You get the hard data for customers and make it easy to understand.',
  'direct', 10,
  'Candidate memorized website pitch, CEO eye-rolled and said "pretend Im your grandmother." This simplified version won. CEO loved it. Another candidate was rejected for failing this exact test per Glassdoor.',
  'SalesTrax — real CEO interview story',
  ARRAY['simplified product explanation', 'grandmother test', 'demonstrates genuine understanding', 'not marketing copy'],
  'Your platform leverages advanced analytics and machine learning to provide actionable insights that drive revenue growth for enterprise organizations.',
  'Parroting marketing copy word-for-word. Shows memorization, not understanding. CEO literally eye-rolled at this approach.'
),

-- 11. Data science background → specific company
(
  'why_this_company', 'sdr_bdr', 'recruiter', 'career_switcher',
  'Why do you want to work at this company?',
  'I want to sell for Leapfin because I think the product is great and as someone with a data science background, I realize how helpful Leapfins platform would be to most companies. Leapfin selling to customers like Reddit, TaskRabbit, and Guideline proves how great this product is and how helpful it is to companies whether they are in e-commerce, marketplace, or fintech.',
  'narrative', 9,
  'Connected personal background to product understanding. Cited specific customers by name. Showed cross-vertical awareness.',
  'Quizlet SDR/BDR flashcard set — real candidate prep',
  ARRAY['personal connection to product', 'names specific customers', 'cross-vertical awareness', 'genuine product enthusiasm'],
  'I want to work at your company because I love the culture and I think its a great opportunity for growth.',
  'No product knowledge. No customer awareness. Culture and growth are generic filler that every candidate says.'
),

-- 12. The value statement spectrum (Orum 250+ interviews)
(
  'why_this_company', 'sdr_bdr', 'recruiter', NULL,
  'What value statements would resonate with our target customer?',
  'We enable reps to have more conversations in a day than a peer not using Orum will have in an entire week. They will have five times as many conversations with targeted contacts as they are having now, leading to sales productivity gains of 50 to 100 percent.',
  'direct', 10,
  'From Orum hiring data (250+ interviews). Only a handful of candidates nailed this. Combines specific data with emotionally charged language. The interviewer explicitly rated this as great vs good ("allows 5x conversations") vs poor ("increases efficiency").',
  'Orum blog — Terry Husayn, 250+ SDR interviews',
  ARRAY['specific multiplier (5x)', 'emotional framing (entire week)', 'prospect-relevant metric', 'competitive comparison'],
  'The product increases efficiency and saves prospects time.',
  'Vague. No numbers. No emotional hook. Every SaaS product claims to increase efficiency. This tells the prospect nothing specific.'
);

-- ─── BEHAVIORAL / STAR ──────────────────────────────────────────────────────

INSERT INTO golden_examples (
  question_key, role_type, round_type, background_type,
  question_text, answer_text, framework, quality_score,
  notes, source,
  authenticity_markers, red_flag_version, red_flag_why
) VALUES

-- 13. Software price objection → discovered real concern
(
  'behavioral_star', 'sdr_bdr', 'hiring_manager', 'experienced_sales',
  'Tell me about a time you handled an objection or overcame rejection.',
  'Rejection and objections are definitely a part of the sales process, and Ive come to view them as opportunities for growth. In my previous role, I had a client object to the price of our software. Instead of just lowering the price, I actively listened and learned that they had concerns about integration with their existing systems. Once I understood that, I was able to explain how our software integrated with those systems and how it would actually save them money in the long run. That led to closing the final sale.',
  'STAR', 9,
  'Demonstrated active listening and discovering the real objection behind the stated one. Didnt just discount — solved the actual problem.',
  'InterviewSmile — real candidate answer',
  ARRAY['real objection behind stated one', 'active listening', 'specific resolution', 'didnt just discount'],
  'When I face rejection I dont take it personally. I just keep pushing forward and stay positive because I know its a numbers game.',
  'No specific story. Numbers game is a cliche. Doesnt show what they actually DID. Sounds like motivational poster, not a real person.'
),

-- 14. Lost deal to competitor → built learning system
(
  'behavioral_star', 'sdr_bdr', 'hiring_manager', 'experienced_sales',
  'Tell me about a time you lost a deal. What did you learn?',
  'A couple of years ago, I was working with a potential client for a couple of weeks, during which things went smoothly. I sent them the proposal and thought I had landed a deal. However, a few days before the deadline, they called me and told me they had decided to go with another vendor. Luckily, I mustered up the courage to ask them why the change of heart. It turned out they chose a competitor who provided a more customized solution. This rejection taught me the importance of truly listening to the client, tailoring my approach accordingly, and knowing when we dont fit a clients needs so I can move on. I started to ask more probing questions and spend more time understanding each clients specific challenges and goals, which led to less time with less qualified leads.',
  'STAR', 10,
  'Specific situation. Honest about the loss. Actionable learning applied to future deals. Shows maturity and asks for feedback after losing.',
  'BigInterview — real candidate answer',
  ARRAY['honest about loss', 'asked for feedback', 'specific competitor reason', 'changed future behavior', 'less time with less qualified leads'],
  'I once lost a deal but I learned from it and came back stronger. In sales you win some and lose some. The important thing is to keep a positive attitude.',
  'No specifics. No learning. Cliches. An interviewer has no idea what this person actually did differently going forward.'
),

-- 15. Entry-level — charity fundraising rejection → asked for coaching
(
  'behavioral_star', 'sdr_bdr', 'recruiter', 'career_switcher',
  'Tell me about a time you faced rejection. How did you handle it?',
  'I may not have sales experience, but Ive certainly had my fair share of rejection. During my time at college, I was part of a student-led initiative to raise funds for a local charity event. One of my responsibilities was reaching out to potential sponsors and donors. Not all of my interactions resulted in a positive outcome. Instead of letting that get to me, I reached out to those sponsors again, asking if they would be open to sharing any insights on how I could improve my pitch.',
  'STAR', 9,
  'Shows resilience AND coachability simultaneously — asking for feedback after rejection. Works without sales experience.',
  'BigInterview — entry-level candidate answer',
  ARRAY['asks for coaching after rejection', 'shows resilience and coachability', 'specific non-sales example', 'initiative to improve'],
  'I handle rejection well because I know its part of the job. I just move on to the next call.',
  'No story. Just move on shows no learning. Doesnt demonstrate what they actually do when rejected.'
),

-- 16. Systematic SDR skill development (unique differentiator)
(
  'behavioral_star', 'sdr_bdr', 'recruiter', NULL,
  'Why should we hire you?',
  'Im incredibly systematic when it comes to my own skill development. If you hire me, you can be sure that after each cold call, Ill be writing in my notebook exactly what went wrong and what went right, so that by the next time Ill have reflected on my performance and improved.',
  'direct', 10,
  'Personal, unique, shows both coachability and growth mindset — traits hiring managers prize over raw experience. The notebook detail makes it specific and believable.',
  'SalesTrax — real SDR candidate answer',
  ARRAY['specific habit (notebook)', 'systematic self-improvement', 'coachability signal', 'unique differentiator'],
  'I am a hard worker and a fast learner. I am very coachable and always looking to improve.',
  'Claims coachability but gives zero evidence. Hard worker and fast learner are the two most overused phrases in SDR interviews.'
);

-- ─── QUESTIONS TO ASK ───────────────────────────────────────────────────────

INSERT INTO golden_examples (
  question_key, role_type, round_type, background_type,
  question_text, answer_text, framework, quality_score,
  notes, source,
  authenticity_markers, red_flag_version, red_flag_why
) VALUES

-- 17. Competitive question + close the interviewer
(
  'questions_to_ask', 'sdr_bdr', 'recruiter', NULL,
  'What questions do you have for us?',
  'What does your top performer do differently from your worst performer? ... Also, I really enjoyed our time today. Based on everything weve discussed, Im confident I am a perfect fit for this SDR role. Do you have any questions or concerns that would hold you back from moving me forward?',
  'direct', 10,
  'First question shows competitive mindset. Close mirrors a sales close — treats interview as a deal. Multiple Bravado members confirmed this gets great reactions.',
  'Bravado War Room — top-voted SDR interview advice',
  ARRAY['competitive question', 'closes the interviewer', 'confident but not arrogant', 'mirrors sales close technique'],
  'What are the next steps in the process? How many people are on the team?',
  'Passive. No closing attempt. Questions could be answered by the job posting. Shows zero sales instinct.'
),

-- 18. Real-time coachability question
(
  'questions_to_ask', 'sdr_bdr', 'hiring_manager', NULL,
  'What questions do you have for us?',
  'If we started this interview all over again, can you take a moment to coach me on something I could have done better?',
  'direct', 10,
  'Demonstrates coachability in real-time. Turns the interview into a coaching moment. Multiple hiring managers across Orum, Bravado, and LinkedIn cited this as one of the best questions theyve ever received.',
  'Bravado + Orum — independently cited by multiple hiring managers',
  ARRAY['real-time coachability', 'vulnerability', 'turns interview into coaching', 'unique and memorable'],
  'Can you tell me about the culture here? What do you enjoy most about working here?',
  'Surface-level. Doesnt reveal anything about how the team operates or what success looks like. Generic.'
),

-- 19. Operational questions that signal sales thinking
(
  'questions_to_ask', 'sdr_bdr', 'hiring_manager', NULL,
  'What questions do you have for us?',
  'What percentage of reps hit quota and at what point in the year is that typically? What does a 30/60/90 day successful ramp look like? Whats the current split between inbound and outbound sourced opportunities?',
  'direct', 9,
  'Asks about quota attainment rate (signals they understand sales math), ramp expectations (shows planning mindset), and pipeline source mix (signals sophistication about lead quality).',
  'Bravado + Drew Coryer (Webflow) — SDR interview recommendations',
  ARRAY['quota attainment question', 'ramp timeline', 'inbound vs outbound split', 'thinks like a rep not an applicant'],
  'Is this role remote? What is the company culture like?',
  'Easily Googleable. Reflects poorly on research skills. Multiple hiring managers (Elric Legloire, 220+ interviews) cite this as an instant red flag.'
);

-- ─── COMP EXPECTATIONS ──────────────────────────────────────────────────────

INSERT INTO golden_examples (
  question_key, role_type, round_type, background_type,
  question_text, answer_text, framework, quality_score,
  notes, source,
  authenticity_markers, red_flag_version, red_flag_why
) VALUES

-- 20. Deflection script
(
  'comp_expectations', 'sdr_bdr', 'recruiter', NULL,
  'What are your compensation expectations?',
  'What is budgeted for the role? ... Right now Im focused on the interview process and dont have a number in mind, but Im confident well be able to reach an agreement.',
  'direct', 9,
  'Deflects without dodging. Shows confidence. Doesnt anchor low. Widely recommended by sales hiring managers on Bravado.',
  'Bravado War Room — multiple comp negotiation threads',
  ARRAY['redirects to employer first', 'confident tone', 'no premature anchoring', 'open to negotiation'],
  'Im flexible on compensation. Ill take whatever you think is fair.',
  'Signals desperation. Gives away all negotiating leverage. Hiring managers see this as a weakness signal — ironic for a sales role.'
);

-- ─── OBJECTION RESPONSES / SELL ME THIS PEN ─────────────────────────────────

INSERT INTO golden_examples (
  question_key, role_type, round_type, background_type,
  question_text, answer_text, framework, quality_score,
  notes, source,
  authenticity_markers, red_flag_version, red_flag_why
) VALUES

-- 21. The "why" chain — discovery-first selling
(
  'objection_response', 'sdr_bdr', 'role_play', NULL,
  'Sell me this pen.',
  'Okay, what do you need? ... Why do you need a new car? ... Why do you want better MPG? ... Why is it important to save money? ... What I hear is you need a car that saves money so you can buy a home. Is that right? ... How serendipitous! Im in the business of selling electric cars. Id love to get you started on your dream as a homeowner.',
  'SPIN', 10,
  'Kept asking why until reaching the emotional core (homeownership dream). Connected product to deeper need. Never listed a single feature. Discovery-first approach.',
  'The Muse — Dan Ratner real interview exchange',
  ARRAY['why chain technique', 'reaches emotional core', 'zero feature listing', 'connects to dream not need'],
  'This is a great pen. It has a smooth ink flow, a comfortable grip, and its very affordable. Would you like to buy it?',
  'Feature dump. No questions. No discovery. No understanding of what the buyer actually needs. This is exactly what interviewers are testing AGAINST.'
);

-- ─── ROLE PLAY / COLD CALL ──────────────────────────────────────────────────

INSERT INTO golden_examples (
  question_key, role_type, round_type, background_type,
  question_text, answer_text, framework, quality_score,
  notes, source,
  authenticity_markers, red_flag_version, red_flag_why
) VALUES

-- 22. Mock cold call closing script
(
  'role_play_script', 'sdr_bdr', 'role_play', NULL,
  'Do a mock cold call to a VP of Marketing.',
  'Based on what youve shared, sounds like youre focused on delivering more campaigns by a measure of 2x but havent been able to hit those targets because its too difficult to get visibility into project statuses. Right now, its a painfully manual process to get what you need done and keeping you from progressing on your other projects. This sounds a lot like a customer of ours. They were spending hours and hours pulling statuses of projects because they didnt have an easier way to do it.',
  'SPIN', 9,
  'Reiterate what you heard → share proof point → drive toward booking. Shows active listening by restating prospect pain in their words.',
  'LinkedIn — GB Blackwell mock interview guide',
  ARRAY['restates prospect pain', 'specific metric (2x)', 'customer proof point', 'natural transition to booking'],
  'Hi, Im calling from XYZ company. We help marketing teams be more efficient. Id love to schedule 15 minutes to show you how we can help. Are you free next Tuesday?',
  'No discovery. No pain acknowledgment. Jumps straight to scheduling without earning the right. This is what gets hung up on.'
),

-- 23. The "I got hired despite awful mock call" story
(
  'role_play_script', 'sdr_bdr', 'role_play', 'career_switcher',
  'How should you approach a mock cold call in an interview?',
  'Dont overcomplicate it. I never position on a first call. Say: We have helped [competitor] in this space with [stat]. We might be able to assist yall too. Ask for the next call. The mock call lasted all of 5 minutes and went awful. The CEO asked to just be sent an email. But in the post-call review, the CEO said I didnt do too bad. Update: I got the job.',
  'direct', 9,
  'Real BDR candidate at PaaS company. Got hired despite self-described awful mock call. What mattered: simplicity, not overcomplicating, and how they handled the debrief. Confirms coachability > perfection.',
  'Bravado War Room — real mock cold call story',
  ARRAY['honest about poor performance', 'simple framework', 'coachability in debrief', 'got hired anyway'],
  'I would research the prospect extensively, prepare a detailed pitch covering all product features, and deliver a polished 10-minute presentation.',
  'Over-engineered. Real cold calls are 2-3 minutes. Feature dumps dont work. Missing the point that coachability matters more than polish.'
);

-- ─── COACHABILITY ───────────────────────────────────────────────────────────

INSERT INTO golden_examples (
  question_key, role_type, round_type, background_type,
  question_text, answer_text, framework, quality_score,
  notes, source,
  authenticity_markers, red_flag_version, red_flag_why
) VALUES

-- 24. Unknown answer → integrity response
(
  'coachability_coaching', 'sdr_bdr', 'role_play', NULL,
  'How do you handle a question you dont know the answer to during a sales call?',
  'Im not 100% sure on that one, let me check with someone more experienced than I am and get back to you.',
  'direct', 10,
  'This scripted response to unknown technical questions demonstrated integrity and coachability and was valued more than product knowledge by multiple hiring managers.',
  'Hyperbound + r/sales — sourced from real sales community',
  ARRAY['honest about not knowing', 'defers to expertise', 'commits to follow-up', 'integrity over performance'],
  'Great question! Let me walk you through how our platform handles that...',
  'Making up an answer to avoid looking uninformed. Hiring managers test for this specifically. Fabrication is an instant disqualifier.'
),

-- 25. Mock call self-assessment (the real test)
(
  'coachability_coaching', 'sdr_bdr', 'role_play', NULL,
  'What do you think about how that role play went?',
  'Heres one thing I did well — I asked a good discovery question early that got them talking about their actual pain point. And heres specifically what Id improve next time — I rushed the close and didnt fully acknowledge their objection before trying to book. Id pause longer and validate their concern first.',
  'direct', 10,
  'Multiple hiring managers (Orum, Gong, Outreach) confirm this is THE test. One good thing + one thing to improve. Red flag: saying the call went great with nothing to improve.',
  'Orum blog + Glassdoor Gong reviews — real interview evaluation criteria',
  ARRAY['one strength acknowledged', 'one specific improvement', 'shows self-awareness', 'actionable next step'],
  'I think that went pretty well actually! I felt good about it.',
  'Red flag at every company that tests coachability. Saying the call went great with nothing to improve signals zero self-awareness. This is the #1 reason candidates fail role-play rounds.'
);

-- ─── RESUME WALKTHROUGH ─────────────────────────────────────────────────────

INSERT INTO golden_examples (
  question_key, role_type, round_type, background_type,
  question_text, answer_text, framework, quality_score,
  notes, source,
  authenticity_markers, red_flag_version, red_flag_why
) VALUES

-- 26. Career switcher framing their non-sales resume
(
  'resume_walkthrough', 'sdr_bdr', 'hiring_manager', 'career_switcher',
  'Walk me through your resume.',
  'So I actually didnt start in sales at all — I was in fundraising at a nonprofit. But looking back, I was selling every single day. I was cold-calling donors, handling objections about giving, and building relationships that led to repeat contributions. When I pivoted our annual gala from in-person to fully online during COVID, that was basically a product launch — I had to re-sell every sponsor on a format theyd never tried. We ended up raising $100K over target. That experience made me realize I wanted to do this in a space with more upside, more urgency, and better tools.',
  'narrative', 10,
  'Reframes non-sales experience as sales. Specific metrics. Honest about the pivot. Shows initiative. Connects past to future.',
  'Composite from Career Contessa + Vendition career switcher profiles',
  ARRAY['reframes non-sales as sales', 'specific dollar metric', 'honest about pivot', 'COVID adaptation story', 'connects past to future'],
  'I worked in nonprofits for two years and now I want to get into tech sales. I dont have direct sales experience but I am a fast learner.',
  'Apologetic tone. Frames non-sales as a gap instead of an asset. Fast learner is the most overused phrase. No reframing.'
);

-- ─── CAREER SWITCHER BRIDGE ─────────────────────────────────────────────────

INSERT INTO golden_examples (
  question_key, role_type, round_type, background_type,
  question_text, answer_text, framework, quality_score,
  notes, source,
  authenticity_markers, red_flag_version, red_flag_why
) VALUES

-- 27. Teacher → SDR with data-driven approach
(
  'career_switcher_bridge', 'sdr_bdr', 'recruiter', 'career_switcher',
  'How does your background prepare you for sales?',
  'I was a math teacher for four years. After a salary freeze, I started looking at what I was actually good at — breaking down complex concepts, reading a room of 30 teenagers, adjusting my approach on the fly when something wasnt landing. Those are sales skills. When I became an SDR, I tracked how many calls I made during each hour of the day, then conversations and conversions. I figured out 8am-9am and 4pm-5pm were my best times. Fridays were my highest conversion days. I got promoted to AE in 6 months.',
  'narrative', 10,
  'Real story from Nick Trueman (teacher → SDR → AE → SDR Manager). Specific data-driven approach. Promoted in 6 months. Teaching skills reframed as sales skills.',
  'Tenbound — Nick Trueman SDR Manager profile',
  ARRAY['specific career transition', 'data-driven call tracking', 'specific time windows', 'promoted in 6 months', 'teaching reframed as sales'],
  'Teaching taught me patience and communication skills that I believe transfer well to a sales environment.',
  'Vague. No data. No specific connection. Every teacher-to-sales candidate says patience and communication. Nothing memorable.'
);

-- ─── COLD EMAIL (TAKE-HOME) ─────────────────────────────────────────────────

INSERT INTO golden_examples (
  question_key, role_type, round_type, background_type,
  question_text, answer_text, framework, quality_score,
  notes, source,
  authenticity_markers, red_flag_version, red_flag_why
) VALUES

-- 28. Stand-out take-home approach
(
  'cold_email', 'sdr_bdr', 'panel', NULL,
  'Write a cold email to a VP-level prospect.',
  'One time, a candidate had created a free trial account on our SaaS tool, plus trials on competitors. He brought in printouts and recommended improvements we should consider and why. I hired him on the spot.',
  'direct', 10,
  'Real hiring story from Raj Khera, EVP at WealthEngine (via SaaStr). The candidate went beyond the assignment — signed up for the product AND competitors. This level of research is what gets people hired on the spot.',
  'SaaStr — Raj Khera, WealthEngine hiring story',
  ARRAY['used the actual product', 'tried competitor products', 'brought specific recommendations', 'hired on the spot'],
  'Hi [Name], I came across your profile on LinkedIn and thought you might be interested in learning about how our platform can help your team increase efficiency.',
  'Generic LinkedIn spam. No research. No trigger event. No personalization. No reason to reply. This is what 95% of candidates write.'
);
