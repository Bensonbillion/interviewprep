/**
 * Content parser for answer cards.
 * Handles JSON extraction from AI responses (code fences, leading prose, etc.)
 * and routes to the correct content type.
 */

/** Try to extract a JSON object or array from raw content. */
export function tryParseJSON(raw: string | unknown): unknown | null {
  if (raw == null) return null;
  if (typeof raw === "object") return raw;

  const str = typeof raw === "string" ? raw : String(raw);
  let cleaned = str.replace(/^\uFEFF/, "").trim();

  // Strip markdown code fences
  cleaned = cleaned
    .replace(/^```(?:json|JSON)?\s*\n?/, "")
    .replace(/\n?\s*```\s*$/, "");

  // Inner code fence (e.g. "Here are the answers:\n```json\n{...}\n```")
  const innerFence = cleaned.match(/```(?:json|JSON)?\s*\n([\s\S]*?)\n\s*```/);
  if (innerFence) {
    const candidate = innerFence[1].trim();
    if (candidate.startsWith("{") || candidate.startsWith("[")) {
      try { return JSON.parse(candidate); } catch { /* fall through */ }
    }
  }

  cleaned = cleaned.trim();

  // Direct parse
  if (cleaned.startsWith("{") || cleaned.startsWith("[")) {
    try { return JSON.parse(cleaned); } catch { /* fall through */ }
  }

  // Aggressive extraction: first { to last }
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    const candidate = cleaned.slice(firstBrace, lastBrace + 1);
    try { return JSON.parse(candidate); } catch { /* fall through */ }
  }

  // First [ to last ]
  const firstBracket = cleaned.indexOf("[");
  const lastBracket = cleaned.lastIndexOf("]");
  if (firstBracket !== -1 && lastBracket > firstBracket) {
    const candidate = cleaned.slice(firstBracket, lastBracket + 1);
    try { return JSON.parse(candidate); } catch { /* ignore */ }
  }

  // Lenient repair: try to fix common AI JSON issues
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    const candidate = cleaned.slice(firstBrace, lastBrace + 1);
    const repaired = repairJson(candidate);
    if (repaired) return repaired;
  }

  return null;
}

/**
 * Attempt to repair common malformed JSON from AI responses:
 * - Unterminated strings (add closing quote)
 * - Trailing commas before } or ]
 * - Unescaped newlines inside strings
 */
function repairJson(raw: string): unknown | null {
  let s = raw;

  // Fix unescaped newlines inside string values
  s = s.replace(/(?<=: "(?:[^"\\]|\\.)*)(\n)(?=[^"]*")/g, "\\n");

  // Remove trailing commas before } or ]
  s = s.replace(/,\s*([}\]])/g, "$1");

  // Try parsing after basic repairs
  try { return JSON.parse(s); } catch { /* continue */ }

  // If string is unterminated, try closing it
  // Find the last unclosed quote and close it + close remaining braces
  try {
    // Count open braces/brackets
    let openBraces = 0;
    let openBrackets = 0;
    let inString = false;
    let escaped = false;

    for (const ch of s) {
      if (escaped) { escaped = false; continue; }
      if (ch === "\\") { escaped = true; continue; }
      if (ch === '"') { inString = !inString; continue; }
      if (inString) continue;
      if (ch === "{") openBraces++;
      if (ch === "}") openBraces--;
      if (ch === "[") openBrackets++;
      if (ch === "]") openBrackets--;
    }

    // If we're still in a string, close it
    let repaired = s;
    if (inString) repaired += '"';

    // Remove trailing commas
    repaired = repaired.replace(/,\s*$/, "");

    // Close remaining braces/brackets
    for (let i = 0; i < openBrackets; i++) repaired += "]";
    for (let i = 0; i < openBraces; i++) repaired += "}";

    return JSON.parse(repaired);
  } catch {
    return null;
  }
}

/** Convert camelCase/snake_case keys to readable labels. */
export function keyToLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase())
    .trim();
}
