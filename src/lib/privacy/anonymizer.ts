/**
 * PII detection and stripping for interview report data.
 *
 * Used before data enters company playbooks or is shown to other users.
 * Uses regex for structured PII (emails, phones, URLs) and
 * known-name stripping for interviewer names.
 */

// ─── Regex patterns ──────────────────────────────────────────────────────────

const EMAIL_RE = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
const PHONE_RE = /(?:\+?\d{1,3}[\s.-]?)?\(?\d{2,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{3,4}/g;
const LINKEDIN_RE = /https?:\/\/(?:www\.)?linkedin\.com\/in\/[a-zA-Z0-9\-_.%]+\/?/gi;
const URL_RE = /https?:\/\/[^\s)<>]+/g;
const STREET_ADDRESS_RE = /\d{1,5}\s+(?:[A-Z][a-z]+\s){1,3}(?:St|Street|Ave|Avenue|Blvd|Boulevard|Dr|Drive|Ln|Lane|Rd|Road|Ct|Court|Way|Pl|Place)\.?(?:\s*,?\s*(?:Suite|Ste|Apt|Unit|#)\s*\d+)?/gi;

// Specific date formats: "March 15, 2024", "03/15/2024", "2024-03-15"
const DATE_FULL_RE = /(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}/gi;
const DATE_SLASH_RE = /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g;
const DATE_ISO_RE = /\b\d{4}-\d{2}-\d{2}\b/g;

// ─── Date anonymization helper ────────────────────────────────────────────────

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function dateToQuarter(dateStr: string): string {
  // Try to parse various date formats
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "[date]";

  const month = d.getMonth(); // 0-indexed
  const year = d.getFullYear();
  if (month < 3) return `early ${year}`;
  if (month < 6) return `Q2 ${year}`;
  if (month < 9) return `Q3 ${year}`;
  return `late ${year}`;
}

function monthNameDateToQuarter(match: string): string {
  for (let i = 0; i < MONTH_NAMES.length; i++) {
    if (match.toLowerCase().startsWith(MONTH_NAMES[i].toLowerCase())) {
      const yearMatch = match.match(/\d{4}/);
      const year = yearMatch ? yearMatch[0] : "";
      if (i < 3) return `early ${year}`;
      if (i < 6) return `Q2 ${year}`;
      if (i < 9) return `Q3 ${year}`;
      return `late ${year}`;
    }
  }
  return "[date]";
}

// ─── Core anonymization ──────────────────────────────────────────────────────

/**
 * Strip PII from free text. Replaces emails, phones, URLs, addresses,
 * and specific dates with safe placeholders.
 *
 * @param text       The text to anonymize
 * @param knownNames Optional list of names to also strip (e.g., interviewer names)
 */
export function anonymizeText(text: string, knownNames?: string[]): string {
  let result = text;

  // LinkedIn URLs first (before general URL replacement)
  result = result.replace(LINKEDIN_RE, "[LinkedIn profile]");

  // Other URLs
  result = result.replace(URL_RE, (match) => {
    // Don't replace already-replaced LinkedIn placeholders
    if (match === "[LinkedIn profile]") return match;
    return "[link]";
  });

  // Email addresses
  result = result.replace(EMAIL_RE, "[email]");

  // Phone numbers (careful — don't replace short number sequences that are metrics)
  result = result.replace(PHONE_RE, (match) => {
    // Only replace if it looks like a real phone number (7+ digits)
    const digits = match.replace(/\D/g, "");
    if (digits.length >= 7) return "[phone]";
    return match;
  });

  // Street addresses
  result = result.replace(STREET_ADDRESS_RE, "[address]");

  // Dates → quarter/season
  result = result.replace(DATE_FULL_RE, monthNameDateToQuarter);
  result = result.replace(DATE_SLASH_RE, (match) => dateToQuarter(match));
  result = result.replace(DATE_ISO_RE, (match) => dateToQuarter(match));

  // Known names (from interviewer_name fields, etc.)
  if (knownNames?.length) {
    for (const name of knownNames) {
      const trimmed = name.trim();
      if (trimmed.length < 2) continue;

      // Escape for regex
      const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      // Match whole word, case-insensitive
      const nameRe = new RegExp(`\\b${escaped}\\b`, "gi");
      result = result.replace(nameRe, "[Name]");

      // Also strip individual parts of multi-word names
      const parts = trimmed.split(/\s+/).filter((p) => p.length >= 3);
      for (const part of parts) {
        const partEscaped = part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const partRe = new RegExp(`\\b${partEscaped}\\b`, "gi");
        result = result.replace(partRe, "[Name]");
      }
    }

    // Collapse multiple consecutive [Name] tokens
    result = result.replace(/(\[Name\]\s*){2,}/g, "[Name] ");
  }

  return result.trim();
}

/**
 * Anonymize a date for public display — only show month/year, never exact day.
 */
export function anonymizeDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

/**
 * Anonymize an interview report's free-text fields.
 * Returns a new object with PII stripped (does not mutate the original).
 */
export function anonymizeReport(report: {
  notes?: string | null;
  advice_for_others?: string | null;
  interviewer_title?: string | null;
  interview_date?: string | null;
}, interviewerNames?: string[]): {
  notes: string | null;
  advice_for_others: string | null;
  interviewer_title: string | null;
  interview_date_display: string | null;
} {
  return {
    notes: report.notes ? anonymizeText(report.notes, interviewerNames) : null,
    advice_for_others: report.advice_for_others
      ? anonymizeText(report.advice_for_others, interviewerNames)
      : null,
    // Interviewer title is safe to show (e.g., "VP of Sales"), but never the name
    interviewer_title: report.interviewer_title ?? null,
    // Only month/year for display
    interview_date_display: report.interview_date
      ? anonymizeDate(report.interview_date)
      : null,
  };
}

/**
 * Anonymize a reported question's free-text fields.
 */
export function anonymizeQuestion(question: {
  question_text: string;
  what_i_actually_said?: string | null;
  what_i_wish_i_said?: string | null;
}, interviewerNames?: string[]): {
  question_text: string;
  what_i_actually_said: null;
  what_i_wish_i_said: null;
} {
  return {
    // Question text is safe to share (it's the interviewer's question, not PII)
    // but still strip any embedded names/contacts
    question_text: anonymizeText(question.question_text, interviewerNames),
    // Personal answer fields are NEVER shared publicly
    what_i_actually_said: null,
    what_i_wish_i_said: null,
  };
}
