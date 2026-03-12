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

  return null;
}

/** Convert camelCase/snake_case keys to readable labels. */
export function keyToLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase())
    .trim();
}
