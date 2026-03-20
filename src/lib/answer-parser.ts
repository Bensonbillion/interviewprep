import type { AnswerType } from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────────

export type SectionKind = "answer" | "reference" | "coaching";

export interface AnswerSection {
  id: string;
  heading: string;
  content: string;
  kind: SectionKind;
}

export interface ParsedAnswer {
  sections: AnswerSection[];
  quickTake: string | null;
  thirtySecond: string | null;
  fullAnswer: string | null;
  proofPoints: string[];
  digDeeper: string | null;
  makeItYours: string | null;
  isStructured: boolean;
}

// ─── Heading classification ─────────────────────────────────────────────────

const HEADING_MAP: Array<{ pattern: RegExp; id: string; kind: SectionKind }> = [
  { pattern: /quick take/i, id: "quick_take", kind: "answer" },
  { pattern: /30[- ]second/i, id: "thirty_second", kind: "answer" },
  { pattern: /full answer/i, id: "full_answer", kind: "answer" },
  { pattern: /proof point|key proof/i, id: "proof_points", kind: "reference" },
  { pattern: /dig deeper|they dig deeper/i, id: "dig_deeper", kind: "reference" },
  { pattern: /make it yours/i, id: "make_it_yours", kind: "coaching" },
];

function classifyHeading(heading: string): { id: string; kind: SectionKind } {
  for (const { pattern, id, kind } of HEADING_MAP) {
    if (pattern.test(heading)) return { id, kind };
  }
  // Unknown headings default to reference
  const id = heading.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
  return { id: id || "unknown", kind: "reference" };
}

// ─── JSON detection ─────────────────────────────────────────────────────────

const JSON_ANSWER_TYPES = new Set<AnswerType>([
  "behavioral_star",
  "role_play_script",
  "objection_response",
  "questions_to_ask",
  "cheat_sheet",
  "company_brief",
  "career_switcher_bridge",
  "coachability_game_plan",
  "competitor_battle_card",
  "cold_email",
  "pain_point_analysis",
  "assignment_guide",
]);

function isJSON(content: string): boolean {
  const trimmed = content.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return false;
  try {
    JSON.parse(trimmed);
    return true;
  } catch {
    return false;
  }
}

// ─── Parser ─────────────────────────────────────────────────────────────────

const EMPTY: ParsedAnswer = {
  sections: [],
  quickTake: null,
  thirtySecond: null,
  fullAnswer: null,
  proofPoints: [],
  digDeeper: null,
  makeItYours: null,
  isStructured: false,
};

/**
 * Parses AI-generated answer content into typed sections.
 *
 * Handles three formats:
 * 1. Answer Card format (## headings) → structured sections
 * 2. Delimiter format (--- separators) → main answer + supporting sections
 * 3. Plain text → returns isStructured: false, caller renders as-is
 *
 * JSON content (behavioral_star, cheat_sheet, etc.) is detected and skipped —
 * those render through ContentRouter's JSON handlers.
 */
export function parseAnswer(
  raw: string | undefined,
  answerType: AnswerType
): ParsedAnswer {
  if (!raw || !raw.trim()) return EMPTY;

  // Skip parsing for JSON content — these render through ContentRouter
  if (JSON_ANSWER_TYPES.has(answerType) && isJSON(raw)) return EMPTY;

  // Split on ## headings
  const headingPattern = /^##\s+(.+)$/gm;
  const matches: Array<{ heading: string; start: number }> = [];
  let m;
  while ((m = headingPattern.exec(raw)) !== null) {
    matches.push({ heading: m[1].trim(), start: m.index });
  }

  // Not Answer Card format — check for --- delimiters
  if (matches.length < 2) {
    const parts = raw.split(/\n---\n/).map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 2) {
      const sections: AnswerSection[] = parts.map((part, i) => ({
        id: i === 0 ? "main_answer" : `section_${i}`,
        heading: i === 0 ? "Answer" : `Section ${i + 1}`,
        content: part,
        kind: (i === 0 ? "answer" : "reference") as SectionKind,
      }));
      return {
        ...EMPTY,
        sections,
        fullAnswer: parts[0],
        isStructured: true,
      };
    }
    // No structure detected
    return EMPTY;
  }

  // Extract sections from ## headings
  const getBody = (idx: number): string => {
    const start = raw.indexOf("\n", matches[idx].start) + 1;
    const end = idx + 1 < matches.length ? matches[idx + 1].start : raw.length;
    return raw.slice(start, end).trim();
  };

  const sections: AnswerSection[] = [];
  let quickTake: string | null = null;
  let thirtySecond: string | null = null;
  let fullAnswer: string | null = null;
  let proofPoints: string[] = [];
  let digDeeper: string | null = null;
  let makeItYours: string | null = null;

  for (let i = 0; i < matches.length; i++) {
    const { heading } = matches[i];
    const body = getBody(i);
    const { id, kind } = classifyHeading(heading);

    sections.push({ id, heading, content: body, kind });

    switch (id) {
      case "quick_take":
        quickTake = body;
        break;
      case "thirty_second":
        thirtySecond = body;
        break;
      case "full_answer":
        fullAnswer = body;
        break;
      case "proof_points":
        proofPoints = body
          .split(/\n/)
          .map((l) => l.replace(/^[-•→*]\s*/, "").trim())
          .filter(Boolean);
        break;
      case "dig_deeper":
        digDeeper = body;
        break;
      case "make_it_yours":
        makeItYours = body;
        break;
    }
  }

  // Must have at least quickTake to use progressive disclosure
  const isStructured = quickTake !== null;

  return {
    sections,
    quickTake,
    thirtySecond,
    fullAnswer,
    proofPoints,
    digDeeper,
    makeItYours,
    isStructured,
  };
}
