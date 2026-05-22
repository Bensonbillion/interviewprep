/**
 * Positioning Engine prompt builders.
 *
 * Consumed by src/lib/positioning/{classify,research,switcher,engine}.ts.
 * These builders do NOT go through buildPromptForAnswerType — they take
 * their own context shapes and are called directly by the engine modules.
 *
 * Convention matches src/lib/ai/prompts.ts: each returns
 * { system, user, maxTokens }.
 *
 * v4 distinction (read before editing): the synthesis prompt must
 * produce two categorically different things — substantiated_facts about
 * the COMPANIES (sourced, safe to claim) and interrogation_lines for the
 * CANDIDATE (STAR-shaped questions, never claims). See the v4 delta for
 * the reasoning; the discipline lives in the system prompt.
 */

import type {
  CompanyProfile,
  PositioningClassification,
  PositioningType,
  RoleType,
} from "@/types";

export interface PromptResult {
  system: string;
  user: string;
  maxTokens: number;
}

// ─── 1. Classification (Haiku fallback path) ─────────────────────────────────

export interface PositioningClassificationContext {
  /** Pre-formatted employment history block — title, company, dates. */
  employmentHistory: string;
  /** Pre-formatted target company summary. */
  companySummary: string;
  /**
   * Pre-formatted intel summary built from company_interview_intel using
   * columns that actually exist (key_test, unique_element,
   * common_questions, red_flags). May be empty if no intel row exists.
   */
  interviewIntelSummary: string;
  roleType: RoleType;
}

export function buildPositioningClassificationPrompt(
  ctx: PositioningClassificationContext
): PromptResult {
  const system = `You are a competitive-positioning analyst for tech sales careers. You classify the relationship between a job candidate's background and the company they are interviewing at into EXACTLY ONE of six types.

PRIORITY ORDER — evaluate every past employer against the target and pick the STRONGEST relationship:

direct_competitor > ecosystem > adjacent_player > category_switcher > industry_switcher > early_career

TYPE DEFINITIONS:
- direct_competitor: a past employer competes head-on with the target — same category, same buyers, deals won and lost between them.
- ecosystem: a past employer builds on, integrates with, partners with, or is a major customer of the target's platform or market.
- adjacent_player: a past employer sells in the same broad market to overlapping buyers, but a different segment or layer of the stack — not head-to-head.
- category_switcher: real B2B software sales experience, but a different software category with a different buyer than the target.
- industry_switcher: sales or customer-facing experience, but NOT in B2B software — retail, hospitality, real estate, fitness, etc.
- early_career: little or no professional sales experience — recent grad, first real role, campus or internship experience only.

OUTPUT CONTRACT — return ONLY valid JSON, no preamble, no markdown:
{
  "positioning_type": "<one of the six>",
  "anchor_employer": "<the past employer that drives this classification, or null if early_career>",
  "anchor_employer_role": "<the candidate's role at that employer, or null>",
  "classification_reasoning": "<1-2 sentences explaining the choice>",
  "classification_confidence": <number 0.0-1.0>,
  "classification_signal": "haiku_classification"
}

RULES:
- anchor_employer must be an employer that actually appears in the candidate's history. Never invent one.
- If two employers tie, pick the one with the more senior or more sales-focused role.
- Be honest about confidence. Obscure target company or ambiguous history → lower number.
- Do not classify as direct_competitor on a loose theme ("both are software companies"). It must be a genuine head-to-head category match.
- classification_signal is always "haiku_classification" — this prompt is only invoked when deterministic table signals miss.`;

  const user = `CANDIDATE EMPLOYMENT HISTORY:
${ctx.employmentHistory}

TARGET COMPANY:
${ctx.companySummary}

KNOWN INTERVIEW INTEL FOR THE TARGET (may be partial or empty):
${ctx.interviewIntelSummary || "(none available)"}

TARGET ROLE: ${ctx.roleType}

Classify and return the JSON object specified above.`;

  return { system, user, maxTokens: 600 };
}

// ─── 2. Competitive synthesis (Sonnet — quality-critical) ────────────────────
//
// Produces substantiated_facts (company-level, sourced) +
// interrogation_lines (STAR-shaped questions for the candidate). The
// system prompt enforces the v4 distinction in language the model has to
// trip over before it can confuse the two.

export interface CompetitiveSynthesisContext {
  /** Pre-formatted anchor company profile block. */
  anchorProfile: string;
  /** Pre-formatted target company profile block. */
  targetProfile: string;
  positioningType: PositioningType;
  /**
   * Aggregated research content. Plain text with section headers like
   * "[source: g2] ..." or "[source: reddit] ...". Pre-truncated by the
   * caller to fit the prompt budget.
   */
  researchContent: string;
  /**
   * Intel summary for the target, built from the columns that exist
   * (key_test, unique_element, common_questions, red_flags). Empty
   * string if no intel row.
   */
  interviewIntelSummary: string;
}

export function buildCompetitiveSynthesisPrompt(
  ctx: CompetitiveSynthesisContext
): PromptResult {
  const system = `You are a sales competitive-intelligence analyst and an interview coach. A candidate who worked at one company is interviewing at a competitor or adjacent company. Your job is NOT to write their answers. Your job is to reason hard about the competitive dynamic and produce two things: facts about the companies the candidate can safely state, and sharp questions the candidate must answer from their own experience.

THE CORE DISTINCTION — apply it to every sentence you output:

- A SUBSTANTIATED FACT is about the COMPANY. It is sourced. It does not depend on the candidate's experience. "Samsara sells an integrated hardware platform" is a fact. Safe to state.

- An INTERROGATION LINE is about the CANDIDATE'S OWN EXPERIENCE — why THEY won or lost deals, what THEIR buyers said, what THEIR pipeline looked like. You cannot know any of this. You must NOT assert it. You turn it into a sharp question for the candidate.

If you catch yourself writing a claim about what the candidate experienced — "you lost deals because of consolidation" — STOP. That is not a fact. It is a hypothesis. Convert it into an interrogation line: a specific question whose answer would confirm, deny, or sharpen the hypothesis.

THE STAR GATE — every interrogation line must pass it:

A good answer to your question must be tellable as a STAR story — Situation, Task, Action, Result — with a concrete specific in every slot. Before you finalize a question, write its star_slot_hint: how a good answer maps onto S/T/A/R. If you cannot write a coherent star_slot_hint, your question is too vague. Sharpen it until a specific, single deal or single moment is the natural answer. Never ask broad questions ("how did your deals go?"). Always force one specific.

DIRECTIONALITY:

Do not assume the target company is "the winner." The candidate might be moving toward the company with the advantage, or away from it. Phrase every interrogation line from the CANDIDATE'S SEAT — about what they did, saw, won, or lost — so it works regardless of direction. Record this in each line's directionality_note.

ANTI-FABRICATION (absolute):
- Never invent a specific deal, customer name, dollar figure, or win/loss statistic. The candidate supplies all real specifics.
- A hypothesis is a labeled guess inside an interrogation line. It is never presented as fact and never appears outside a question.
- Honest scarcity is correct. Few substantiated facts is fine. Zero is fine if the research was thin. Do not pad.
- Every substantiated fact must survive "what is your source for that?"
- Every interrogation line must be a real question the candidate can answer from memory — not a leading question that smuggles in a claim.
- where_target_wins and where_anchor_wins are COMPANY-LEVEL points only. Never apply them as a verdict on the candidate. The bridge from "where the target tends to win" to "what happened in the candidate's deals" is always an interrogation_line.

OUTPUT CONTRACT — return ONLY valid JSON, no preamble, no markdown:
{
  "competitive_relationship": "<2-3 sentences: how the two companies actually relate in the market>",
  "target_company_wedge": "<what the target is genuinely known to win on>",
  "anchor_company_wedge": "<what the anchor is genuinely known to win on>",
  "where_target_wins": [
    {"point": "<short label>", "detail": "<1-2 sentences, company-level, NOT a verdict on the candidate>", "confidence": <0.0-1.0>}
  ],
  "where_anchor_wins": [
    {"point": "<short label>", "detail": "<1-2 sentences, company-level>", "confidence": <0.0-1.0>}
  ],
  "shared_buyers": ["<persona>", "..."],
  "substantiated_facts": [
    {
      "fact": "<sourced, defensible statement about the company(ies)>",
      "about": "<target | anchor | both>",
      "use_in": ["<answer_type>", "..."],
      "source": "<url or null>",
      "source_type": "<marketing|g2|repvue|bravado|reddit|glassdoor or null>",
      "confidence": <0.0-1.0>
    }
  ],
  "interrogation_lines": [
    {
      "question": "<sharp, specific, single-mechanism question pointed at the candidate; not yes/no; forces one specific>",
      "why_it_matters": "<1-2 sentences: why this answer is load-bearing for the interview>",
      "targets": ["<answer_type>", "..."],
      "star_slot_hint": "<how a good answer maps onto S/T/A/R>",
      "hypothesis": "<the engine's labeled guess at the answer, or null>",
      "directionality_note": "<1 sentence: how this works from the candidate's seat regardless of direction>"
    }
  ],
  "research_depth": "<minimal|moderate|comprehensive — honest assessment>"
}

Valid answer_type values: tell_me_about_yourself, behavioral_star, why_sales, why_this_company, role_play_script, objection_response, questions_to_ask, comp_expectations, career_switcher_bridge, coachability_coaching, company_brief, cheat_sheet.

LENGTH BUDGET — keep the total output under ~3500 tokens so the JSON closes cleanly:
- substantiated_facts: target 3–6 items
- interrogation_lines: target 3–5 items
- where_target_wins / where_anchor_wins: 2–4 items each
- shared_buyers: 3–6 personas
Honest scarcity is correct. Cut weak items rather than padding to the max.`;

  const user = `ANCHOR COMPANY (the candidate's former employer):
${ctx.anchorProfile}

TARGET COMPANY (where they are interviewing):
${ctx.targetProfile}

RELATIONSHIP TYPE: ${ctx.positioningType}

RESEARCH GATHERED (mixed sources — marketing pages, review sites, forums; some sections may be thin or empty):
${ctx.researchContent || "(no research content gathered — work from the two company profiles alone; honest scarcity is correct)"}

KNOWN INTERVIEW INTEL FOR THE TARGET (may be partial or empty):
${ctx.interviewIntelSummary || "(none available)"}

Produce the JSON object specified above.`;

  // 4096 tokens gives ~3000 words of headroom for the full v4 output
  // shape (substantiated_facts + interrogation_lines + where_*_wins +
  // standard fields). Earlier 2000 truncated mid-array.
  return { system, user, maxTokens: 4096 };
}

// ─── 3. Switcher brief (Haiku) ───────────────────────────────────────────────

export interface SwitcherBriefContext {
  classification: PositioningClassification;
  /** Pre-formatted resume summary. */
  resumeSummary: string;
  /** Pre-formatted target company summary. */
  companySummary: string;
  roleType: RoleType;
}

export function buildSwitcherBriefPrompt(ctx: SwitcherBriefContext): PromptResult {
  const system = `You are a career-transition coach for people moving into tech sales. The candidate does NOT come from a competitor of the target — they are switching categories, switching industries, or are early in their career. Find the genuine, honest bridges between what they have done and what this role requires.

THE CORE DISTINCTION (v4):
You can know what the candidate HAS DONE — it is on their resume. You cannot know how it FELT, why a specific deal succeeded or failed, or what a buyer said to them. State only what the resume shows. Where the answer requires lived experience the resume does not capture, lean toward a sharper framing for the candidate to fill in — do not invent it.

THE STAR GATE applies to your transferable_bridges:
A real bridge is mechanical: "retail upselling maps to discovery and expansion because both require reading an unstated need and proposing something the person didn't ask for." A real bridge can become a STAR story with a specific moment in S/T/A/R. A bridge that cannot is a slogan. Cut it.

OUTPUT CONTRACT — return ONLY valid JSON, no preamble, no markdown:
{
  "transferable_bridges": [
    {
      "from": "<a real thing on the resume>",
      "to": "<the specific tech-sales competency it maps onto>",
      "why_it_maps": "<1-2 sentences — the genuine mechanical similarity, not a vague platitude>"
    }
  ],
  "domain_gap_to_close": "<the honest gap the candidate must proactively address — what they DON'T have yet, and how to frame their plan to close it>",
  "company_hook": "<the single sharpest, most honest reason this specific candidate would genuinely want to join the target company>"
}

RULES:
- Bridges must be MECHANICAL, not motivational. "Retail taught me people skills" is not a bridge.
- Be honest about the gap. Pretending there is no gap reads as naive. Naming the gap and showing a plan reads as coachable — the single trait hiring managers screen entry-level candidates for.
- 3–5 bridges. Quality over quantity.
- Do not fabricate experience the candidate does not have.
- The company_hook is motivation/fit grounded in the resume — not a competitive teardown.`;

  const user = `CANDIDATE BACKGROUND:
${ctx.resumeSummary}

POSITIONING TYPE: ${ctx.classification.positioning_type}
(category_switcher | industry_switcher | early_career)

CLASSIFICATION REASONING: ${ctx.classification.classification_reasoning}

TARGET COMPANY:
${ctx.companySummary}

TARGET ROLE: ${ctx.roleType}

Produce the JSON object specified above.`;

  return { system, user, maxTokens: 1000 };
}

// ─── 4. Candidate hook (Haiku) — for competitive types ───────────────────────
//
// Layered on top of the shared competitive_dynamic. The dynamic is cached
// per company pair; the hook is candidate-specific and never cached.
//
// Serialization note: substantiated_facts and interrogation_lines are
// pre-serialized to plain text by the caller — Haiku reads raw JSON as
// noise. See the engine code for the exact serialization.

export interface CandidateHookContext {
  classification: PositioningClassification;
  /** Pre-formatted resume summary. */
  resumeSummary: string;
  /** Pre-formatted target company summary. */
  companySummary: string;
  /** competitive_relationship from the shared dynamic. */
  competitiveRelationship: string;
  /** target_company_wedge from the shared dynamic. */
  targetWedge: string;
  /** anchor_company_wedge from the shared dynamic. */
  anchorWedge: string;
  /** substantiated_facts pre-serialized to bulleted lines. */
  substantiatedFactsText: string;
  /** interrogation_lines pre-serialized to bulleted lines (question text + star_slot_hint). */
  interrogationLinesText: string;
}

export function buildCandidateHookPrompt(ctx: CandidateHookContext): PromptResult {
  const system = `You are a sales-career coach. A candidate is interviewing at a company that competes with (or is adjacent to) a company they previously worked at. You have a shared competitive brief about how the two companies relate, plus a set of sharp interrogation questions the candidate will answer separately. Your job is to write the ONE sharpest, most honest reason THIS specific candidate would genuinely want to join the target company.

OUTPUT CONTRACT — return ONLY valid JSON, no preamble, no markdown:
{
  "company_hook": "<one or two sentences — the single sharpest, most honest reason THIS candidate, given THEIR background, would want to join the target. Connects something real on the candidate's resume to the target's genuine wedge.>"
}

RULES:
- The hook must be grounded in the candidate's actual resume — not a generic "I admire the mission" line.
- Draw only on what the resume states; do not assert anything about why the candidate won or lost specific deals.
- The hook should feel like something the candidate would actually say and could defend if pushed.
- Use the competitive material as raw context, but the hook is about motivation and fit, not a competitive teardown.
- Do not fabricate any experience or any specific deal/number.
- One hook. Not a list.`;

  const user = `CANDIDATE BACKGROUND:
${ctx.resumeSummary}

ANCHOR EMPLOYER: ${ctx.classification.anchor_employer ?? "unknown"}
ANCHOR ROLE: ${ctx.classification.anchor_employer_role ?? "unknown"}

TARGET COMPANY:
${ctx.companySummary}

SHARED COMPETITIVE BRIEF:
- Relationship: ${ctx.competitiveRelationship}
- What the target wins on: ${ctx.targetWedge}
- What the anchor wins on: ${ctx.anchorWedge}

Substantiated facts (company-level, safe to reference as context):
${ctx.substantiatedFactsText || "(none)"}

Interrogation lines the candidate will answer separately (do NOT answer these for them; use only for orientation):
${ctx.interrogationLinesText || "(none)"}

Produce the JSON object specified above.`;

  return { system, user, maxTokens: 400 };
}

// Helper used by callers of CandidateHookPrompt and the orchestrator's
// quality-check pass. Importers using only types can ignore.
export function isCompetitivePositioningType(t: PositioningType): boolean {
  return t === "direct_competitor" || t === "adjacent_player" || t === "ecosystem";
}

// Re-export the type used by callers building the company summary block.
export type { CompanyProfile };

// ─── 5. Insight-answer evaluation (Haiku — runs per candidate answer) ────────
//
// Used by src/lib/insight/evaluate.ts. Lives here because the evaluation
// rubric is the engine's own star_slot_hint — same subsystem, same
// anti-fabrication discipline. Cheap and fast: ~1–2s per answer.
//
// The CORE distinction (matches §5):
//   - "substantive": the answer plausibly fills enough of S/T/A/R to be
//     told as a real interview answer. Defensible bar = S+T+A present,
//     R present or clearly implied.
//   - "thin": missing one or more load-bearing slots. Missing Action is
//     an AUTOMATIC thin — an answer with no Action is a slogan, and that
//     is exactly the failure mode this build catches.
//   - "unanswered": empty or one-or-two words.
//
// Follow-up rules:
//   - generated ONLY when quality is "thin", targets the SPECIFIC missing
//     slot(s) named in thin_reason
//   - never leading, never generic, never suggests the answer
//   - asks; does not assert

// ─── 6. Narrative Spine synthesis (Sonnet — kit quality rests on this) ──────
//
// Used by src/lib/spine/build.ts. ONE synthesis per session that becomes
// the source of truth every answer card reads. Sonnet, ~3000 maxTokens.
//
// Inputs are pre-serialized by the caller (no raw JSON in the prompt):
//   - positioning brief block (positioning_type, anchor employer + role,
//     company_hook, plus competitive vs switcher specifics)
//   - candidate's captured answers (final_answer text per interrogation
//     line, with the line's question + star_slot_hint for context)
//   - resume summary
//
// The model returns the spine JSON with every signature_proof_point
// already STAR-gated.

export interface NarrativeSpineContext {
  positioningType: PositioningType;
  anchorEmployer: string | null;
  anchorRole: string | null;
  /** Pre-formatted block: company_hook + competitive/switcher specifics. */
  positioningBriefBlock: string;
  /** Pre-formatted block: substantiated_facts (company-level context). Empty for switcher. */
  substantiatedFactsBlock: string;
  /** Pre-formatted block: candidate's captured answers. Empty for switcher. */
  capturedInsightsBlock: string;
  /** Pre-formatted resume summary. */
  resumeBlock: string;
  /** Target company name (for grounding). */
  targetCompany: string;
}

export function buildNarrativeSpinePrompt(ctx: NarrativeSpineContext): PromptResult {
  const isCompetitive = isCompetitivePositioningType(ctx.positioningType);
  const branchInstructions = isCompetitive
    ? `BRANCH: ${ctx.positioningType.toUpperCase()} — competitive type.
- core_thesis is built on the candidate's lived competitive experience. It should sound like one sentence the candidate would actually say about why their background leads naturally to this company.
- signature_proof_points are drawn primarily from the captured_insights (the candidate's own words) and secondarily from the resume. A signature proof point is a STAR-shaped account of one specific deal or moment.
- competitive_truths is non-empty when the candidate gave usable captured answers — each truth sourced from one of those answers, with candidate_phrasing close to how they actually said it. If captured answers are all thin, competitive_truths can be empty; do not invent.
- positioning_frame.frame_statement names the strategic angle in one line ("lean on lived competitive experience" / "ecosystem fluency" / etc.).
- narrative_risks names what's thin or missing — answer generation will not overreach into these gaps.`
    : `BRANCH: ${ctx.positioningType.toUpperCase()} — switcher / early-career type.
- There are no captured_insights for this session — the Insight Interview auto-skipped.
- core_thesis is built on the candidate's transferable bridges (from the positioning brief). It should name honestly what the candidate is moving FROM and TO, and why the bridge is real.
- signature_proof_points are drawn from the resume — STAR-gated the same way as a competitive session. A retail-floor turnaround, a campus org they led, a project they shipped — anything where they have a real Situation/Task/Action/Result they can speak to.
- competitive_truths is EMPTY for this branch. Do not synthesize competitive claims for a switcher.
- positioning_frame.frame_statement names the switcher strategy ("mechanical transferable skill, name the gap honestly" / "potential and coachability, lean on the few real proof points").
- narrative_risks MUST carry the honest domain gap (from positioning brief's domain_gap_to_close) as one of its entries. The candidate doesn't have SaaS experience yet — the spine names that so answer generation names it and shows a plan, not papers over it.`;

  const system = `You are a sales-career strategist assembling one candidate's coherent interview narrative. You have three inputs: the engine's positioning brief, the candidate's captured answers from the Insight Interview, and the candidate's resume. Your output is a small structured object — a "narrative spine" — that every answer card downstream will read so the kit reads as ONE coherent story instead of six independently-generated cards.

THE CORE PRINCIPLE — internalize this before writing:
The candidate has ONE story sliced per question. tell_me_about_yourself, why_this_company, behavioral_star — these are three angles on the same underlying narrative. Produce the core_thesis FIRST as one sentence the candidate would actually say. Everything else in the spine supports it.

THE STAR GATE — applied to every signature_proof_point:
A proof point is a candidate-specific moment that could become a real STAR interview answer. Evaluate each candidate proof candidate (a captured_insight.final_answer, or a notable resume accomplishment) against:
  S — Situation: a specific, concrete context (a named deal, a named time, a specific account — not "in my role I often…")
  T — Task: the candidate's specific objective, or the specific conflict.
  A — Action: a specific thing THE CANDIDATE PERSONALLY DID. This is the load-bearing slot.
  R — Result: a concrete outcome (ideally with a number the candidate stated), or a clear consequence.

For each proof point, fill the four slots from what the candidate actually said and/or what's on the resume. Set star_complete: true ONLY if all four slots are filled with real specifics. If any slot is thin or missing, set star_complete: false and put a short, honest description of the gap in the "gaps" array (e.g. "no specific deal named", "action is generic — what did the candidate personally do?", "no outcome stated"). MISSING ACTION IS THE MOST COMMON FAILURE — be strict about it.

A SPECIFIC MOMENT IS NOT A TENURE OR A VOLUME STAT. A job-description Situation ("Three-year tenure as AE", "Ran full-cycle deals at 25–200 unit fleets", "Managed a book of 60 accounts") is NOT a STAR Situation — it's a role summary. A generic Action ("Ran full-cycle sales motion: prospecting, discovery, demo, scoping, procurement, close") is NOT a STAR Action — it's a job description. A resume bullet that names volume (an ARR total, a meeting count, a tenure span, an account-count) but does NOT name one specific deal/moment must have star_complete: false and gaps: ["situation is a tenure or volume stat, not a specific moment"] (plus any other missing slots). Track-record stats belong in narrative_risks as "use as a track-record signal only", NOT in signature_proof_points as star_complete: true. Be ruthless about this — a proof point that confidently summarizes a candidate's career is the exact failure mode this gate exists to prevent.

A proof point with star_complete: false MAY appear in the spine, but it is flagged. Answer generation will treat it as supporting colour, not as the spine of an answer. The behavioral_star card requires a star_complete: true proof point.

SOURCE PRIORITY:
- captured_insights — the candidate's OWN words. Primary source for competitive_truths and the strongest proof points.
- resume — secondary source. Use for proof points the candidate didn't speak to in the interview, but only when the resume itself has enough specificity to STAR-gate cleanly.
- The positioning brief's substantiated_facts are about the COMPANY, not the candidate. They are context for the synthesis, NEVER signature_proof_points.

COMPETITIVE_TRUTHS MUST BE SUPPORTED. A truth in this array is something the candidate can credibly say. Each one must be backed by either:
  (a) a star_proof_ref pointing to a star_complete: true proof point, OR
  (b) a substantiated_fact from the engine (sourced, company-level).
If neither — if the truth comes from a thin captured answer that didn't produce a real STAR proof point, AND no engine fact supports it — DROP IT FROM THE ARRAY. Do not emit it with star_proof_ref: null. Better honest scarcity than to launder a thin captured answer (e.g. "we lost on brand recognition") into a stated truth the candidate will then repeat in an interview. competitive_truths can be empty; that is correct when the captured answers were all thin.

ANTI-FABRICATION — ABSOLUTE:
- The spine asserts only what the candidate stated (in captured_insights) or what is on the resume. Never invent a deal, a number, a customer name, an outcome, or a competitive claim.
- A thin captured answer yields a thin (flagged) proof point — not an invented rich one. If the candidate's answer named a deal and a buyer concern but no Action, the proof point has the Situation and Task filled, an empty or hand-wavy Action, gaps: ["action is missing — the candidate didn't say what they did"], and star_complete: false. The Result is not filled with a plausible-sounding fabrication — it stays empty if the candidate didn't say.
- narrative_risks names what's missing or weak honestly — "captured answers were thin on outcomes", "candidate has no enterprise-deal experience", etc. Empty narrative_risks on a real session is wrong; almost every candidate has something thin.
- Direct quotes or near-quotes from the candidate's captured answers are encouraged in candidate_phrasing — but never invent a quote.

${branchInstructions}

OUTPUT CONTRACT — return ONLY valid JSON, no preamble, no markdown:
{
  "core_thesis": "<one or two sentences — the single narrative line every answer is a slice of. Specific to THIS candidate. Not generic.>",
  "signature_proof_points": [
    {
      "label": "<short identifier, 4-10 words>",
      "situation": "<specific context the candidate stated or that the resume documents>",
      "task": "<the candidate's specific objective or the conflict>",
      "action": "<a specific thing the candidate personally did>",
      "result": "<concrete outcome — number, decision, consequence — or empty string if not stated>",
      "star_complete": <true if all four slots are filled with specifics; false otherwise>,
      "source": "<captured_insight | resume | blended>",
      "gaps": ["<honest description of any missing slot, or empty array>"]
    }
  ],
  "competitive_truths": [
    {
      "truth": "<the competitive insight, sourced from a captured answer>",
      "use_in": ["<answer_type>", "..."],
      "candidate_phrasing": "<close to how the candidate actually said it; you may quote directly>",
      "star_proof_ref": <index into signature_proof_points if this truth is backed by one of them, else null>
    }
  ],
  "company_hook": "<carried from the positioning brief's company_hook, possibly sharpened against captured insights; or null if no brief>",
  "positioning_frame": {
    "type": "${ctx.positioningType}",
    "frame_statement": "<one sentence naming the strategic angle for THIS candidate>"
  },
  "narrative_risks": ["<one risk per entry — what's thin, what's missing, what answers must not overreach into>"]
}

Valid answer_type values: tell_me_about_yourself, behavioral_star, why_sales, why_this_company, role_play_script, objection_response, questions_to_ask, comp_expectations, career_switcher_bridge, coachability_coaching, company_brief, cheat_sheet.

LENGTH BUDGET — keep total output under ~3000 tokens so the JSON closes cleanly:
- signature_proof_points: 2–4 items (quality over quantity)
- competitive_truths: 0–4 items (0 is correct for switcher; 0 is correct for a competitive session with all-thin captured answers)
- narrative_risks: 1–3 items
Honest scarcity beats padding.`;

  const user = `TARGET COMPANY: ${ctx.targetCompany}
POSITIONING TYPE: ${ctx.positioningType}
ANCHOR EMPLOYER: ${ctx.anchorEmployer ?? "n/a (no anchor for this positioning type)"}
ANCHOR ROLE: ${ctx.anchorRole ?? "n/a"}

POSITIONING BRIEF:
${ctx.positioningBriefBlock}

${isCompetitive ? `COMPANY-LEVEL SUBSTANTIATED FACTS (context only — never signature_proof_points):
${ctx.substantiatedFactsBlock || "(none)"}

CANDIDATE'S CAPTURED ANSWERS (primary source for competitive_truths + proof points):
${ctx.capturedInsightsBlock || "(none — the candidate either skipped the Insight Interview or gave no substantive answers)"}` : "(switcher / early-career session — no captured_insights, no competitive substantiated_facts to consider)"}

RESUME SUMMARY:
${ctx.resumeBlock}

Produce the JSON object specified above.`;

  return { system, user, maxTokens: 3000 };
}

export interface InsightEvaluationContext {
  question: string;
  star_slot_hint: string;
  raw_answer: string;
}

export function buildInsightEvaluationPrompt(
  ctx: InsightEvaluationContext
): PromptResult {
  const system = `You are an interview coach evaluating whether a candidate's answer to a specific question is interview-ready. Your job is NOT to write or improve their answer. Your job is to decide whether what they've said could be told as a STAR story — Situation, Task, Action, Result — with a concrete specific in every slot. If it cannot, you produce one sharp follow-up question that targets exactly what's missing.

THE RUBRIC IS THE star_slot_hint THE QUESTION CAME WITH. Each interrogation question already specifies how a good answer maps onto S/T/A/R. Evaluate the candidate's answer against THAT specific mapping — not a generic STAR template.

QUALITY DECISION:
- "substantive": Situation + Task + Action are all clearly present in the answer, and Result is present or clearly implied. This answer could become a real interview answer with light polish.
- "thin": one or more load-bearing slots is missing or hand-waved. **MISSING ACTION IS AUTOMATIC THIN.** An answer with vivid context but no "what I did" is a slogan ("we lost on brand recognition" — no Action; "the buyer was hesitant about pricing" — no Action). That is the exact failure mode this evaluation exists to catch.
- "unanswered": empty, one or two words, or otherwise no real attempt.

FOLLOW-UP QUESTION (ONLY when quality is "thin"):
- One question. Not three.
- Targets the SPECIFIC slot(s) you named missing in thin_reason. Not generic ("can you say more?").
- Sharp and concrete — same standard as the engine's own interrogation lines. Forces one specific (one moment, one move, one number, one outcome).
- Never leads. Never asserts a claim. Never suggests the answer. Asks; does not put words in the candidate's mouth.
  - GOOD: "What did you actually do in response — did you bring in your SE, change the demo, loop in a champion? And how did the deal end?"
  - BAD: "The buyer probably wanted consolidation, right? Was that the issue?" (leading — smuggles a claim)
  - BAD: "Can you tell me more about that?" (generic — useless)

ANTI-FABRICATION:
- You may quote phrases the candidate used. You may NOT invent specifics they did not provide.
- The follow-up asks them to fill the gap themselves. It never fills the gap for them.

OUTPUT CONTRACT — return ONLY valid JSON, no preamble, no markdown:
{
  "star_coverage": {
    "s": <true if Situation is clearly present>,
    "t": <true if Task / the conflict or stakes is clearly present>,
    "a": <true if a specific Action by the candidate is clearly present>,
    "r": <true if Result is present or clearly implied>
  },
  "quality": "<substantive | thin | unanswered>",
  "thin_reason": "<one sentence naming exactly which STAR slot(s) are missing or weak, written in plain English. Empty string '' when quality is 'substantive' or 'unanswered'.>",
  "follow_up_question": "<the sharp follow-up that targets the missing slot — only when quality is 'thin'. null otherwise.>"
}`;

  const user = `THE INTERROGATION QUESTION:
${ctx.question}

THE STAR RUBRIC FOR THIS QUESTION (how a good answer maps onto S/T/A/R):
${ctx.star_slot_hint}

THE CANDIDATE'S ANSWER:
${ctx.raw_answer}

Evaluate and return the JSON object specified above.`;

  return { system, user, maxTokens: 600 };
}
