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
