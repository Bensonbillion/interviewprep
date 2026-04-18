/**
 * Parses generated answer content into a structured render type.
 * Handles JSON (various shapes), markdown, and plain text.
 * Used by answer cards and defense prep tabs to render content correctly.
 */

// ─── Result types ────────────────────────────────────────────────────────────

export type RenderResult =
  | { type: "markdown"; text: string }
  | { type: "weak_spots"; items: WeakSpot[] }
  | { type: "question_list"; items: QuestionItem[] }
  | { type: "cheat_points"; items: CheatPoint[]; permission_to_stop?: string }
  | { type: "email"; subject: string; body: string; personalization_rationale?: string; alternative_subjects?: string[] }
  | { type: "discovery_questions"; items: DiscoveryQuestion[] }
  | { type: "icp"; data: IcpData }
  | { type: "timing"; items: TimingSlide[] }
  | { type: "roleplay"; lines: RoleplayLine[]; golden_rule?: string }
  | { type: "prospects"; items: Prospect[] };

export interface WeakSpot {
  area: string;
  severity: string;
  what_they_said?: string;
  why_its_vulnerable?: string;
  likely_question: string;
  model_answer: string;
  trap_to_avoid?: string;
  who_asks?: string;
}

export interface QuestionItem {
  question: string;
  asked_by?: string;
  what_theyre_testing?: string;
  model_answer: string;
  trap_to_avoid?: string;
  coachability_note?: string;
}

export interface CheatPoint {
  point: string;
  detail: string;
  who_its_for?: string;
}

export interface DiscoveryQuestion {
  question: string;
  category: string;
  what_it_uncovers?: string;
}

export interface IcpData {
  org_types: string[];
  pain_points: string[];
  decision_makers: string[];
  anti_icp?: string[];
}

export interface TimingSlide {
  slide: string;
  time_range: string;
  key_move: string;
  coaching_note?: string;
  risk?: string;
  tip?: string;
}

export interface RoleplayLine {
  speaker: string;
  text: string;
  coaching?: string;
}

export interface Prospect {
  company_name: string;
  why_they_fit: string;
  trigger_signal: string;
  target_contact?: { name: string; title: string } | string;
  research_note?: string;
}

// ─── JSON answer types that have specific render formats ─────────────────────

const JSON_ANSWER_TYPES = new Set([
  "weakness_audit",
  "defense_questions",
  "cheat_sheet",
  "cold_email_draft",
  "discovery_questions",
  "icp_definition",
  "presentation_structure",
  "role_play_script",
  "prospecting_targets",
]);

// ─── Main function ───────────────────────────────────────────────────────────

export function renderAnswerContent(content: string, answerType: string): RenderResult {
  if (!content || content.trim().length === 0) {
    return { type: "markdown", text: "" };
  }

  // Only attempt JSON parsing for known structured types
  if (JSON_ANSWER_TYPES.has(answerType)) {
    const parsed = tryParseJson(content);
    if (parsed !== null) {
      const result = mapToRenderType(parsed, answerType);
      if (result) return result;
    }
  }

  // Fallback: treat as markdown/plain text
  return { type: "markdown", text: content };
}

// ─── JSON parsing ────────────────────────────────────────────────────────────

function tryParseJson(content: string): unknown {
  // Strip markdown code fences
  const cleaned = content
    .replace(/^```(?:json)?\s*/gi, "")
    .replace(/\s*```\s*$/gi, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

// ─── Type mapping ────────────────────────────────────────────────────────────

function mapToRenderType(parsed: unknown, answerType: string): RenderResult | null {
  switch (answerType) {
    case "weakness_audit":
      return parseWeakSpots(parsed);
    case "defense_questions":
      return parseQuestionList(parsed);
    case "cheat_sheet":
      return parseCheatSheet(parsed);
    case "cold_email_draft":
      return parseEmail(parsed);
    case "discovery_questions":
      return parseDiscoveryQuestions(parsed);
    case "icp_definition":
      return parseIcp(parsed);
    case "presentation_structure":
      return parseTiming(parsed);
    case "role_play_script":
      return parseRoleplay(parsed);
    case "prospecting_targets":
      return parseProspects(parsed);
    default:
      return null;
  }
}

// ─── Parsers ─────────────────────────────────────────────────────────────────

function parseWeakSpots(parsed: unknown): RenderResult {
  const items = extractArray(parsed, ["weak_spots", "items", "audit"]);
  if (items.length === 0) return { type: "markdown", text: JSON.stringify(parsed, null, 2) };
  return {
    type: "weak_spots",
    items: items.map((w) => ({
      area: str(w, "area"),
      severity: str(w, "severity") || "medium",
      what_they_said: str(w, "what_they_said"),
      why_its_vulnerable: str(w, "why_its_vulnerable"),
      likely_question: str(w, "likely_question"),
      model_answer: str(w, "model_answer"),
      trap_to_avoid: str(w, "trap_to_avoid"),
      who_asks: str(w, "who_asks"),
    })),
  };
}

function parseQuestionList(parsed: unknown): RenderResult {
  const items = extractArray(parsed, ["questions", "items", "hard_questions"]);
  if (items.length === 0) return { type: "markdown", text: JSON.stringify(parsed, null, 2) };
  return {
    type: "question_list",
    items: items.map((q) => ({
      question: str(q, "question"),
      asked_by: str(q, "asked_by"),
      what_theyre_testing: str(q, "what_theyre_testing"),
      model_answer: str(q, "model_answer"),
      trap_to_avoid: str(q, "trap_to_avoid"),
      coachability_note: str(q, "coachability_note"),
    })),
  };
}

function parseCheatSheet(parsed: unknown): RenderResult {
  if (!isObj(parsed)) return { type: "markdown", text: JSON.stringify(parsed, null, 2) };
  const obj = parsed as Record<string, unknown>;
  const points = extractArray(obj, ["points", "items"]);
  return {
    type: "cheat_points",
    items: points.map((p) => ({
      point: str(p, "point"),
      detail: str(p, "detail"),
      who_its_for: str(p, "who_its_for"),
    })),
    permission_to_stop: typeof obj.permission_to_stop === "string" ? obj.permission_to_stop : undefined,
  };
}

function parseEmail(parsed: unknown): RenderResult {
  if (!isObj(parsed)) return { type: "markdown", text: JSON.stringify(parsed, null, 2) };
  const obj = parsed as Record<string, unknown>;
  return {
    type: "email",
    subject: (obj.subject as string) ?? "",
    body: (obj.body as string) ?? "",
    personalization_rationale: obj.personalization_rationale as string | undefined,
    alternative_subjects: Array.isArray(obj.alternative_subjects) ? obj.alternative_subjects as string[] : undefined,
  };
}

function parseDiscoveryQuestions(parsed: unknown): RenderResult {
  const items = extractArray(parsed, ["questions", "items", "discovery_questions"]);
  if (items.length === 0) return { type: "markdown", text: JSON.stringify(parsed, null, 2) };
  return {
    type: "discovery_questions",
    items: items.map((q) => ({
      question: str(q, "question"),
      category: str(q, "category"),
      what_it_uncovers: str(q, "what_it_uncovers"),
    })),
  };
}

function parseIcp(parsed: unknown): RenderResult {
  if (!isObj(parsed)) return { type: "markdown", text: JSON.stringify(parsed, null, 2) };
  const obj = parsed as Record<string, unknown>;
  return {
    type: "icp",
    data: {
      org_types: arrStr(obj.org_types),
      pain_points: arrStr(obj.pain_points),
      decision_makers: arrStr(obj.decision_makers),
      anti_icp: obj.anti_icp ? arrStr(obj.anti_icp) : undefined,
    },
  };
}

function parseTiming(parsed: unknown): RenderResult {
  const items = extractArray(parsed, ["slides", "items", "timing"]);
  if (items.length === 0) return { type: "markdown", text: JSON.stringify(parsed, null, 2) };
  return {
    type: "timing",
    items: items.map((t) => ({
      slide: str(t, "slide"),
      time_range: str(t, "time_range"),
      key_move: str(t, "key_move"),
      coaching_note: str(t, "coaching_note"),
      risk: str(t, "risk"),
      tip: str(t, "tip"),
    })),
  };
}

function parseRoleplay(parsed: unknown): RenderResult {
  if (!isObj(parsed)) return { type: "markdown", text: JSON.stringify(parsed, null, 2) };
  const obj = parsed as Record<string, unknown>;
  const lines = Array.isArray(obj.lines) ? (obj.lines as Array<Record<string, unknown>>) : [];
  return {
    type: "roleplay",
    lines: lines.map((l) => ({
      speaker: (l.speaker as string) ?? "",
      text: (l.text as string) ?? "",
      coaching: l.coaching as string | undefined,
    })),
    golden_rule: obj.golden_rule as string | undefined,
  };
}

function parseProspects(parsed: unknown): RenderResult {
  const items = extractArray(parsed, ["prospects", "items", "targets"]);
  if (items.length === 0) return { type: "markdown", text: JSON.stringify(parsed, null, 2) };
  return {
    type: "prospects",
    items: items.map((p) => ({
      company_name: str(p, "company_name"),
      why_they_fit: str(p, "why_they_fit"),
      trigger_signal: str(p, "trigger_signal"),
      target_contact: (p as Record<string, unknown>).target_contact as Prospect["target_contact"],
      research_note: str(p, "research_note"),
    })),
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isObj(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function str(obj: unknown, key: string): string {
  if (!isObj(obj)) return "";
  const val = (obj as Record<string, unknown>)[key];
  return typeof val === "string" ? val : "";
}

function arrStr(val: unknown): string[] {
  return Array.isArray(val) ? val.filter((v): v is string => typeof v === "string") : [];
}

function extractArray(parsed: unknown, keys: string[]): unknown[] {
  if (Array.isArray(parsed)) return parsed;
  if (isObj(parsed)) {
    for (const key of keys) {
      const val = (parsed as Record<string, unknown>)[key];
      if (Array.isArray(val)) return val;
    }
  }
  return [];
}
