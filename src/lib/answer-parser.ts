import type { AnswerType } from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AnswerSection {
  id: string;
  title: string;
  content: string;
  type: "answer" | "reference" | "coaching";
}

export interface ParsedAnswer {
  sections: AnswerSection[];
  quickTake: string | null;
  shortAnswer: string | null;
  fullAnswer: string | null;
  proofPoints: string | null;
  followups: string | null;
  coaching: string | null;
  isStructured: boolean;
}

// ─── JSON detection ──────────────────────────────────────────────────────────

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

// ─── Section classification ──────────────────────────────────────────────────

function classifySection(
  title: string,
  index: number,
  hasTitle: boolean
): { id: string; type: AnswerSection["type"] } {
  const lower = title.toLowerCase();

  // Quick take / TLDR — no heading, first chunk
  if (!hasTitle && index === 0) {
    return { id: "quick_take", type: "reference" };
  }

  // 30-second / short version
  if (/30[- ]?sec|short|brief|elevator|quick version/i.test(lower)) {
    return { id: "short", type: "answer" };
  }

  // Full answer
  if (/full answer|full version|60[- ]?sec|complete|detailed/i.test(lower)) {
    return { id: "full", type: "answer" };
  }

  // Proof points / metrics
  if (/proof|metric|key.*point|evidence|data/i.test(lower)) {
    return { id: "proof_points", type: "reference" };
  }

  // Dig deeper / follow-ups
  if (/dig deeper|follow[- ]?up|they.*ask|anticipat|deeper/i.test(lower)) {
    return { id: "followups", type: "reference" };
  }

  // Make it yours / coaching
  if (/make it yours|coach|personal|customiz|tailor|tip/i.test(lower)) {
    return { id: "coaching", type: "coaching" };
  }

  // Quick take explicitly named
  if (/quick take|tldr|tl;dr|summary|key message/i.test(lower)) {
    return { id: "quick_take", type: "reference" };
  }

  // Fallback — if it's the first or second section and looks like an answer
  if (index <= 1) {
    return { id: `answer_${index}`, type: "answer" };
  }

  return { id: lower.replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "") || `section_${index}`, type: "reference" };
}

// ─── Parser ──────────────────────────────────────────────────────────────────

const EMPTY: ParsedAnswer = {
  sections: [],
  quickTake: null,
  shortAnswer: null,
  fullAnswer: null,
  proofPoints: null,
  followups: null,
  coaching: null,
  isStructured: false,
};

/**
 * Parses AI-generated answer content into typed sections.
 *
 * The AI outputs content in this general format:
 * "Quick take [text]. --- ## 30-second version [text] --- ## Full answer [text] ---
 *  ## Key proof points [text] --- ## If they dig deeper [text] --- ## Make it yours [text]"
 *
 * Handles multiple splitting strategies in order of preference:
 * 1. Split on ## headings (standard markdown H2s)
 * 2. Split on --- delimiters with various whitespace patterns
 * 3. Single content block (renders as one answer section)
 *
 * JSON content (behavioral_star, cheat_sheet, etc.) is detected and skipped —
 * those render through ContentRouter's JSON handlers.
 */
export function parseAnswer(
  raw: string | undefined,
  answerType: AnswerType
): ParsedAnswer {
  if (!raw || !raw.trim()) return EMPTY;

  // Skip parsing for JSON content
  if (JSON_ANSWER_TYPES.has(answerType) && isJSON(raw)) return EMPTY;
  // Also skip if it's JSON regardless of type
  if (isJSON(raw)) return EMPTY;

  // Very short content — single answer section
  const trimmed = raw.trim();
  if (trimmed.split(/\s+/).length < 30) {
    return {
      ...EMPTY,
      sections: [{ id: "main", title: "Answer", content: trimmed, type: "answer" }],
      fullAnswer: trimmed,
      isStructured: true,
    };
  }

  // Strategy 1: Split on ## headings
  const headingPattern = /^##\s+(.+)$/gm;
  const headings: Array<{ heading: string; start: number; end: number }> = [];
  let match;
  while ((match = headingPattern.exec(raw)) !== null) {
    headings.push({
      heading: match[1].trim(),
      start: match.index,
      end: match.index + match[0].length,
    });
  }

  if (headings.length >= 2) {
    // There may be content before the first heading (quick take)
    const preHeadingContent = raw.slice(0, headings[0].start).replace(/---/g, "").trim();
    const sections: AnswerSection[] = [];

    if (preHeadingContent && preHeadingContent.length > 10) {
      const { id, type } = classifySection("", 0, false);
      sections.push({ id, title: "", content: preHeadingContent, type });
    }

    for (let i = 0; i < headings.length; i++) {
      const bodyStart = headings[i].end;
      const bodyEnd = i + 1 < headings.length ? headings[i + 1].start : raw.length;
      const body = raw.slice(bodyStart, bodyEnd).replace(/^\s*---\s*$/gm, "").trim();
      if (!body) continue;

      const { id, type } = classifySection(headings[i].heading, sections.length, true);
      sections.push({ id, title: headings[i].heading, content: body, type });
    }

    return buildResult(sections);
  }

  // Strategy 2: Split on --- delimiters (try multiple patterns)
  let parts: string[] = raw.split(/\n---\n/).map((p) => p.trim()).filter(Boolean);
  if (parts.length < 2) {
    parts = raw.split(/\s---\s/).map((p) => p.trim()).filter(Boolean);
  }
  if (parts.length < 2) {
    parts = raw.split(/---/).map((p) => p.trim()).filter(Boolean);
  }

  if (parts.length >= 2) {
    const sections: AnswerSection[] = [];

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      // Check if this part has a ## heading
      const hMatch = part.match(/^##\s*(.+)$/m);
      const title = hMatch ? hMatch[1].trim() : "";
      const body = hMatch ? part.slice(part.indexOf("\n", part.indexOf(hMatch[0])) + 1).trim() || part.replace(/^##\s*.+$/m, "").trim() : part;

      const { id, type } = classifySection(title, i, !!hMatch);
      sections.push({ id, title, content: body, type });
    }

    return buildResult(sections);
  }

  // Strategy 3: No structure detected — return as single answer section
  // This ensures content ALWAYS goes through Markdown rendering
  return {
    ...EMPTY,
    sections: [{ id: "main", title: "", content: trimmed, type: "answer" }],
    fullAnswer: trimmed,
    isStructured: true,
  };
}

// ─── Build result from sections ──────────────────────────────────────────────

function buildResult(sections: AnswerSection[]): ParsedAnswer {
  if (sections.length === 0) return EMPTY;

  let quickTake: string | null = null;
  let shortAnswer: string | null = null;
  let fullAnswer: string | null = null;
  let proofPoints: string | null = null;
  let followups: string | null = null;
  let coaching: string | null = null;

  for (const s of sections) {
    switch (s.id) {
      case "quick_take":
        quickTake = s.content;
        break;
      case "short":
        shortAnswer = s.content;
        break;
      case "full":
        fullAnswer = s.content;
        break;
      case "proof_points":
        proofPoints = s.content;
        break;
      case "followups":
        followups = s.content;
        break;
      case "coaching":
        coaching = s.content;
        break;
      default:
        // If we don't have an answer yet, use this as the answer
        if (s.type === "answer" && !fullAnswer && !shortAnswer) {
          fullAnswer = s.content;
        }
        break;
    }
  }

  // If we found answer sections but no explicit short/full, assign intelligently
  const answerSections = sections.filter((s) => s.type === "answer");
  if (answerSections.length === 1 && !shortAnswer && !fullAnswer) {
    fullAnswer = answerSections[0].content;
  } else if (answerSections.length >= 2 && !shortAnswer && !fullAnswer) {
    shortAnswer = answerSections[0].content;
    fullAnswer = answerSections[1].content;
  }

  return {
    sections,
    quickTake,
    shortAnswer,
    fullAnswer,
    proofPoints,
    followups,
    coaching,
    isStructured: true,
  };
}

// ─── Utility: count bullet items ─────────────────────────────────────────────

export function countBullets(content: string): number {
  return content.split("\n").filter((l) => /^\s*[-•*→]\s/.test(l) || /^\s*\d+[\.\)]\s/.test(l)).length;
}
