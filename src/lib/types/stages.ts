// src/lib/types/stages.ts

export type StageType =
  | 'conversational'
  | 'deep_dive'
  | 'skills_demo'
  | 'take_home'
  | 'presentation_defense'
  | 'panel_executive'

export interface StageConfig {
  stage_name: string
  stage_type: StageType
  stage_order: number
  parent_session_id?: string
}

export interface StageTypeMetadata {
  type: StageType
  label: string
  description: string
  cheat_sheet_framing: string
  example_names: string[]
}

export const STAGE_TYPE_METADATA: Record<StageType, StageTypeMetadata> = {
  conversational: {
    type: 'conversational',
    label: 'Recruiter / Culture',
    description: 'Gate round. They\'re checking basics — research, communication, genuine interest.',
    example_names: ['Recruiter Screen', 'Culture Fit', 'Intro Call', 'Coffee Chat'],
    cheat_sheet_framing: 'This is a gate round. Keep all answers under 90 seconds. They\'re checking three things: did you research us, can you communicate, are you genuinely interested. Ask better questions than anyone else they\'ve spoken to.',
  },
  deep_dive: {
    type: 'deep_dive',
    label: 'Hiring Manager / VP',
    description: 'Metrics round. They want specific numbers, deal stories, and methodology depth.',
    example_names: ['Hiring Manager', 'Director Interview', 'VP Sales', 'Second Round'],
    cheat_sheet_framing: 'They\'ve moved past \'can you sell?\' They\'re asking \'would I want this person on my team?\' Lead with numbers every time. Have three more layers ready under every answer.',
  },
  skills_demo: {
    type: 'skills_demo',
    label: 'Cold Call / Roleplay',
    description: 'The re-run after coaching IS the evaluation — not the first attempt.',
    example_names: ['Cold Call Roleplay', 'Mock Discovery', 'Live Pitch', 'SDR Demo'],
    cheat_sheet_framing: 'The cold call itself is not the evaluation. The re-run after their feedback IS. They coach you, you adjust in real time, you run it again better. Say "Got it — let me try that again" and actually do it differently.',
  },
  take_home: {
    type: 'take_home',
    label: 'Take-Home Assignment',
    description: 'Output generator — actually builds your submission, not just coaching.',
    example_names: ['Take-Home Assignment', 'Case Study', 'Presentation Task', 'Research Project'],
    cheat_sheet_framing: 'The most common mistake is being product-focused instead of problem-focused. Open every section with the prospect\'s pain, not the company\'s features. Cite evidence for every choice you make.',
  },
  presentation_defense: {
    type: 'presentation_defense',
    label: 'Presenting Your Work',
    description: 'We read what you submitted. We know where the hard questions will come from.',
    example_names: ['Panel Presentation', 'Deck Defense', 'Case Study Review', 'Presentation Round'],
    cheat_sheet_framing: 'They already know what you submitted. They\'re testing whether you can defend your thinking. Say "I went with X because Y" confidently. If they push back: "That\'s a fair challenge — if I revisited it, I\'d consider Z." Never apologize for a choice.',
  },
  panel_executive: {
    type: 'panel_executive',
    label: 'Panel / Final Round',
    description: 'Every person in that room has veto power. Consistency across interviewers matters.',
    example_names: ['Panel Interview', 'Executive Round', 'Final Interview', 'Culture Interview'],
    cheat_sheet_framing: 'Every person in that room has veto power. Be consistent with everything you said in prior rounds. Answer to the person who asked, make eye contact with everyone. This is the close — show that you want THIS specifically, not just any job.',
  },
}

export type AnswerSlotMetadata = {
  answer_type: string
  label: string
  description: string
  is_free?: boolean
  metadata?: Record<string, unknown>
}

export const STAGE_SLOT_MAP: Record<StageType, AnswerSlotMetadata[]> = {
  conversational: [
    { answer_type: 'tell_me_about_yourself', label: 'Tell me about yourself', description: 'Your 30-second and full answer, built from your background', is_free: true },
    { answer_type: 'why_sales', label: 'Why sales?', description: 'Your genuine motivation — not a generic answer' },
    { answer_type: 'why_this_company', label: 'Why this company?', description: 'Company-specific — bridges their ICP to your background' },
    { answer_type: 'comp_expectations', label: 'Comp expectations', description: 'How to frame current vs target without anchoring low' },
    { answer_type: 'questions_to_ask', label: 'Questions to ask', description: 'Recruiter-specific questions including the power close' },
    { answer_type: 'cheat_sheet', label: 'Stage cheat sheet', description: 'What this round is really evaluating and how to pass it' },
  ],
  deep_dive: [
    { answer_type: 'tell_me_about_yourself', label: 'Tell me about yourself', description: 'Metrics-first version — quota, deal size, cycle length upfront', is_free: true, metadata: { version: 'metrics_first' } },
    { answer_type: 'behavioral_star', label: 'Biggest win', description: 'Your best deal story with specific numbers', metadata: { story_type: 'biggest_win' } },
    { answer_type: 'behavioral_star', label: 'Recovery story', description: 'How you recovered from a failure or difficult quarter', metadata: { story_type: 'recovery_failure' } },
    { answer_type: 'company_brief', label: 'Company research brief', description: 'Their sales motion, ICP, methodology — know their world' },
    { answer_type: 'role_play_script', label: 'Discovery process walkthrough', description: 'Walk through how you actually run a deal from pipe to close' },
    { answer_type: 'objection_response', label: 'Objection handling', description: 'The 4 most common pushbacks for this product category' },
    { answer_type: 'questions_to_ask', label: 'Questions to ask', description: 'HM-specific — ramp, team structure, what success looks like at 90 days' },
    { answer_type: 'cheat_sheet', label: 'Stage cheat sheet', description: 'What the hiring manager is actually scoring you on' },
  ],
  skills_demo: [
    { answer_type: 'role_play_script', label: 'Cold call script', description: 'Opener, pattern interrupt, bridge to reason for call, ask for meeting', is_free: true },
    { answer_type: 'discovery_questions', label: 'Discovery framework', description: 'Specific to their ICP and sales motion — not generic questions' },
    { answer_type: 'objection_response', label: 'Objection handling', description: '5 objections you\'ll face in the roleplay with responses' },
    { answer_type: 'coachability_coaching', label: 'The coachability moment', description: 'How to respond to feedback and nail the re-run — this is what they\'re scoring' },
    { answer_type: 'cheat_sheet', label: 'Stage cheat sheet', description: 'What the evaluator is watching for beyond the call itself' },
  ],
  take_home: [
    { answer_type: 'icp_definition', label: 'ICP definition', description: 'Org types, pain points, decision-maker titles — structured and copy-ready', is_free: true },
    { answer_type: 'prospecting_targets', label: '3 real prospects', description: 'Real named accounts that fit the ICP with triggers and rationale' },
    { answer_type: 'cold_email_draft', label: 'Cold email', description: 'Full email in your voice — subject, body, CTA, personalization rationale' },
    { answer_type: 'discovery_questions', label: 'Discovery questions', description: '7-10 questions mapped by category with "why asking" annotations' },
    { answer_type: 'presentation_structure', label: 'Slide outline', description: 'Recommended slide order, content per slide, timing guidance' },
    { answer_type: 'video_script', label: 'Video script', description: 'Scene-by-scene script for the video walkthrough, practice-ready' },
  ],
  presentation_defense: [
    { answer_type: 'weakness_audit', label: 'Weakness audit', description: 'The 3 spots in your submission most likely to be challenged', is_free: true },
    { answer_type: 'defense_questions', label: 'Hard questions + model answers', description: 'What they\'ll ask about YOUR specific submission, with strong answers' },
    { answer_type: 'presentation_structure', label: 'How to present it', description: 'Pacing, what to emphasize, what to skim — for the live presentation' },
    { answer_type: 'role_play_script', label: 'Discovery roleplay', description: 'The live discovery call they run at the end of the panel' },
    { answer_type: 'cheat_sheet', label: 'Stage cheat sheet', description: 'How to defend work confidently without being defensive' },
  ],
  panel_executive: [
    { answer_type: 'culture_stories', label: 'Culture fit stories', description: '3 stories mapped to their specific company values — sounds natural, not scripted', is_free: true },
    { answer_type: 'executive_presence', label: 'Executive presence', description: 'How to handle multiple interviewers, bigger-picture answers, vision alignment' },
    { answer_type: 'tell_me_about_yourself', label: 'TMAY — narrative arc', description: 'The closing argument version — ties the whole journey together', metadata: { version: 'narrative_arc' } },
    { answer_type: 'behavioral_star', label: 'New behavioral stories', description: 'Stories they haven\'t heard yet — different from HM round', metadata: { story_type: 'panel_fresh' } },
    { answer_type: 'questions_to_ask', label: 'Questions to ask', description: 'Panel-specific — team culture, long-term success, next steps' },
    { answer_type: 'cheat_sheet', label: 'Stage cheat sheet', description: 'Consistency across interviewers, how to close the room' },
  ],
}

export interface VoiceProfile {
  id: string
  user_id: string
  samples: Array<{
    type: 'email' | 'linkedin' | 'story'
    text: string
  }>
  style_notes: {
    sentence_avg_words?: number
    uses_contractions?: boolean
    formality_score?: number  // 1-5, 1=casual, 5=formal
    hedging_phrases?: string[]
    common_openers?: string[]
  }
  voice_summary?: string
}

export interface CompanyInterviewIntel {
  id: string
  company_id: string
  stage_type: StageType
  stage_name?: string
  typical_order?: number
  frequency: number
  questions_reported: Array<{
    question: string
    frequency: number
  }>
  format_notes?: string
}

export interface TakeHomeContent {
  icp?: {
    org_types: string[]
    pain_points: string[]
    decision_makers: string[]
    anti_icp: string[]
    raw_content: string
  }
  prospects?: Array<{
    company_name: string
    why_they_fit: string
    trigger_signal: string
    target_title: string
    research_note: string
  }>
  cold_email?: {
    subject: string
    body: string
    personalization_rationale: string
    alternative_subjects: string[]
  }
  discovery_questions?: Array<{
    question: string
    category: string
    what_it_uncovers: string
  }>
  presentation_structure?: {
    slides: Array<{ title: string; content: string }>
    timing_notes: string
    evaluation_criteria: string[]
  }
  video_script?: {
    scenes: Array<{ title: string; script: string; duration_sec: number }>
    total_duration_sec: number
  }
}
