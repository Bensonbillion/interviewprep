"use server";

/**
 * Post-generation quality check — scans AI answers for anti-patterns
 * that real hiring managers flag as instant disqualifiers.
 *
 * Runs AFTER generation, BEFORE storing/displaying.
 * Returns issues sorted by severity: critical → warning → suggestion.
 */

import { createAdminClient } from "@/lib/supabase/admin";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface QualityIssue {
  severity: "critical" | "warning" | "suggestion";
  pattern: string;
  location: string;
  fix: string;
}

export interface QualityCheckResult {
  issues: QualityIssue[];
  criticalCount: number;
  warningCount: number;
  suggestionCount: number;
  /** Coaching tips to display alongside the answer (warnings only). */
  coachingTips: string[];
  /** If true, caller should regenerate with correction instructions. */
  shouldRegenerate: boolean;
  /** Correction prompt to append if regenerating. */
  correctionPrompt: string | null;
}

// ── Red-flag phrase patterns ──────────────────────────────────────────────────

interface PhrasePattern {
  regex: RegExp;
  label: string;
  fix: string;
  severity: "critical" | "warning";
}

const RED_FLAG_PHRASES: PhrasePattern[] = [
  { regex: /\bi am passionate about\b/i, label: '"I am passionate about"', fix: "Show passion through a specific story instead of stating it", severity: "critical" },
  { regex: /\bi(?:'m| am) passionate\b/i, label: '"I am/I\'m passionate"', fix: "Show passion through a specific story instead of stating it", severity: "critical" },
  { regex: /\bthrive in (?:a )?fast[- ]paced environments?\b/i, label: '"thrive in fast-paced environments"', fix: "Give a specific example of working under pressure with a metric", severity: "critical" },
  { regex: /\bi am a hard worker\b/i, label: '"I am a hard worker"', fix: "Show work ethic through a specific achievement instead", severity: "critical" },
  { regex: /\bi(?:'m| am) a quick learner\b/i, label: '"I am a quick learner"', fix: "Give a specific example of learning something quickly with a timeline", severity: "critical" },
  { regex: /\bthroughout my career\b/i, label: '"throughout my career"', fix: "Reference a specific role or time period instead", severity: "critical" },
  { regex: /\bi believe my experience\b/i, label: '"I believe my experience"', fix: "State it directly: 'My experience at X taught me Y'", severity: "warning" },
  { regex: /\bbring [\w\s]+ to the table\b/i, label: '"bring X to the table"', fix: "State the value directly without the cliche", severity: "warning" },
  { regex: /\bdetail[- ]oriented\b/i, label: '"detail-oriented"', fix: "Show attention to detail through a specific example", severity: "warning" },
  { regex: /\bresults[- ]driven\b/i, label: '"results-driven"', fix: "Show results with a specific metric instead", severity: "warning" },
  { regex: /\bself[- ]starter\b/i, label: '"self-starter"', fix: "Describe a specific initiative you took without being asked", severity: "warning" },
  { regex: /\bsynerg(?:y|ies|ize)\b/i, label: '"synergy/synergize"', fix: "Say what you actually combined or collaborated on", severity: "warning" },
  { regex: /\butilize\b/i, label: '"utilize"', fix: "Say 'use' — it's what people actually say out loud", severity: "warning" },
  { regex: /\bleverage(?:d)?\b/i, label: '"leverage"', fix: "Say 'use', 'build on', or 'apply' instead", severity: "warning" },
  { regex: /\bfurthermore\b/i, label: '"Furthermore"', fix: "Use 'and' or 'plus' — natural spoken transitions", severity: "warning" },
  { regex: /\bmoreover\b/i, label: '"Moreover"', fix: "Use 'on top of that' or 'and also' — spoken language", severity: "warning" },
  { regex: /\badditionally\b/i, label: '"Additionally"', fix: "Use 'and' or 'also' — nobody says 'additionally' out loud", severity: "warning" },
];

// ── Structural checks ─────────────────────────────────────────────────────────

/** Answer types that should sound spoken (not structured JSON). */
const SPOKEN_ANSWER_TYPES = new Set([
  "tell_me_about_yourself",
  "why_sales",
  "why_this_company",
  "comp_expectations",
  "constructive_feedback",
  "resume_walkthrough",
  "coachability_coaching",
]);

function checkStructuralRedFlags(content: string, answerType: string): QualityIssue[] {
  const issues: QualityIssue[] = [];
  const sentences = content.split(/(?<=[.!?])\s+/).filter((s) => s.length > 10);
  const isSpoken = SPOKEN_ANSWER_TYPES.has(answerType);

  // Starts with "I am a..." or "As a..."
  if (/^(?:I am a |As a )/i.test(content.trim())) {
    issues.push({
      severity: "critical",
      pattern: "Opens with 'I am a...' or 'As a...'",
      location: sentences[0]?.slice(0, 80) ?? content.slice(0, 80),
      fix: "Start with a specific moment, metric, or hook — not a title declaration. 80%+ of candidates open this way.",
    });
  }

  // Thesis restatement ending
  if (/(?:that(?:'s| is) (?:exactly )?why I|in (?:summary|conclusion)|to summarize)\b/i.test(content.slice(-200))) {
    issues.push({
      severity: "warning",
      pattern: "Ends with thesis restatement",
      location: sentences[sentences.length - 1]?.slice(0, 80) ?? "",
      fix: "End with forward energy or a natural trail-off, not a formal conclusion",
    });
  }

  // Enumeration: "First... Second... Third..."
  const enumerators = content.match(/\b(?:first(?:ly)?|second(?:ly)?|third(?:ly)?)\b/gi) ?? [];
  if (enumerators.length >= 3) {
    issues.push({
      severity: "warning",
      pattern: "Uses 'First... Second... Third...' enumeration",
      location: "Multiple locations",
      fix: "Use natural transitions: 'the main thing was X, and on top of that Y'",
    });
  }

  // No contractions in spoken answers (check for absence)
  if (isSpoken && content.length > 200) {
    const contractions = content.match(/\b(?:I'm|I've|I'd|it's|that's|they're|didn't|don't|won't|wasn't|weren't|couldn't|shouldn't|can't|isn't|aren't|we're|you're|there's|here's|let's|he's|she's|who's|what's|where's|how's)\b/g) ?? [];
    const wordCount = content.split(/\s+/).length;
    // Expect at least 1 contraction per ~50 words in spoken language
    if (contractions.length < wordCount / 80) {
      issues.push({
        severity: "critical",
        pattern: "No contractions in spoken answer",
        location: "Entire answer",
        fix: "This will be said out loud — use contractions throughout (I've, it's, that's, didn't)",
      });
    }
  }

  // Uniform sentence length (low variance = AI pattern)
  if (sentences.length >= 5) {
    const lengths = sentences.map((s) => s.split(/\s+/).length);
    const avg = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    const variance = lengths.reduce((sum, l) => sum + (l - avg) ** 2, 0) / lengths.length;
    const stdDev = Math.sqrt(variance);
    // Low std dev relative to average means all sentences are roughly the same length
    if (avg > 0 && stdDev / avg < 0.2) {
      issues.push({
        severity: "warning",
        pattern: "Uniform sentence length (AI pattern)",
        location: "Entire answer",
        fix: "Mix short punchy sentences (3-6 words) with longer flowing ones — that's how people talk",
      });
    }
  }

  // No specific numbers/metrics in 3+ consecutive sentences
  if (isSpoken && sentences.length >= 4) {
    let noMetricStreak = 0;
    let maxStreak = 0;
    for (const s of sentences) {
      if (/\d/.test(s) || /\b(?:percent|%|quota|million|thousand|hundred)\b/i.test(s)) {
        noMetricStreak = 0;
      } else {
        noMetricStreak++;
        maxStreak = Math.max(maxStreak, noMetricStreak);
      }
    }
    if (maxStreak > 4) {
      issues.push({
        severity: "suggestion",
        pattern: `${maxStreak} consecutive sentences without a specific number or metric`,
        location: "Middle of answer",
        fix: "Add at least one concrete metric (%, $, count, ranking) to anchor credibility",
      });
    }
  }

  return issues;
}

// ── Content-specific checks ─────────────────────────────────────────────────

function checkContentRedFlags(content: string, answerType: string): QualityIssue[] {
  const issues: QualityIssue[] = [];
  const lower = content.toLowerCase();

  switch (answerType) {
    case "tell_me_about_yourself": {
      // Chronological bio starting from education
      if (/^(?:so )?(?:i )?graduated from|^(?:i )?went to [\w\s]+ (?:university|college)/i.test(content.trim())) {
        issues.push({
          severity: "critical",
          pattern: "Starts with education chronology",
          location: content.slice(0, 80),
          fix: "Start with a hook — a metric, a moment, or what you do NOW. Education can come later.",
        });
      }
      break;
    }

    case "why_sales": {
      if (/\b(?:the money|the compensation|earning potential|high earnings|uncapped (?:income|earnings|commission))\b/i.test(content) &&
          !(/\bbut (?:what|the thing)\b/i.test(content))) {
        issues.push({
          severity: "warning",
          pattern: "Primary motivation stated as money",
          location: "Answer body",
          fix: "Money can be mentioned but should never be the lead or primary motivation — lead with the work itself",
        });
      }
      break;
    }

    case "questions_to_ask": {
      const googleable = [
        /how (?:many|big|large) is (?:the|your) (?:company|team|org)/i,
        /when was .+ founded/i,
        /(?:is|are) (?:the|you|this) (?:company|role|position) (?:fully )?remote/i,
        /where (?:is|are) .+ (?:headquartered|based|located)/i,
        /how many employees/i,
      ];
      for (const re of googleable) {
        if (re.test(content)) {
          issues.push({
            severity: "critical",
            pattern: "Contains easily Googleable question",
            location: content.match(re)?.[0]?.slice(0, 60) ?? "",
            fix: "Never ask what you can Google — it signals zero research. Ask about what top performers do differently.",
          });
          break; // One is enough
        }
      }
      break;
    }

    case "comp_expectations": {
      if (/\bi(?:'m| am) flexible\b/i.test(content) || /\bi'll take whatever\b/i.test(content) || /take whatever you think/i.test(content)) {
        issues.push({
          severity: "critical",
          pattern: "Signals desperation on comp",
          location: content.match(/i(?:'m| am) flexible|i'll take whatever|take whatever you think/i)?.[0] ?? "",
          fix: "Deflect with 'What is budgeted for the role?' — never signal you'll take anything",
        });
      }
      break;
    }

    case "role_play_script": {
      // Check for discovery questions in cold call scripts
      const hasDiscovery = /\?/.test(content) && (/discovery/i.test(content) || (content.match(/\?/g)?.length ?? 0) >= 2);
      if (!hasDiscovery && lower.includes("opener") === false) {
        // Only flag if this looks like a script body, not structured JSON
        if (!content.startsWith("{")) {
          issues.push({
            severity: "warning",
            pattern: "Cold call script missing discovery questions",
            location: "Script body",
            fix: "Include at least 2-3 discovery questions before any pitch — talk-to-listen ratio matters",
          });
        }
      }
      break;
    }

    default:
      break;
  }

  return issues;
}

// ── Main check function ───────────────────────────────────────────────────────

export function checkAnswerQuality(
  content: string,
  answerType: string,
  seniority: string = "mid"
): QualityCheckResult {
  const issues: QualityIssue[] = [];

  // Skip quality checks for structured JSON answers — they have their own format rules
  const trimmed = content.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    // Still check phrase patterns in any text values
    const textContent = trimmed.replace(/"[^"]*":\s*/g, "");
    for (const p of RED_FLAG_PHRASES) {
      if (p.regex.test(textContent)) {
        issues.push({
          severity: p.severity,
          pattern: p.label,
          location: textContent.match(p.regex)?.[0] ?? "",
          fix: p.fix,
        });
      }
    }
  } else {
    // Full checks for prose/spoken answers

    // 1. Red-flag phrase scan
    for (const p of RED_FLAG_PHRASES) {
      const match = content.match(p.regex);
      if (match) {
        // Find the sentence containing the match
        const idx = content.indexOf(match[0]);
        const sentenceStart = content.lastIndexOf(".", idx - 1) + 1;
        const sentenceEnd = content.indexOf(".", idx);
        const sentence = content.slice(
          Math.max(0, sentenceStart),
          sentenceEnd > idx ? sentenceEnd + 1 : Math.min(content.length, idx + 80)
        ).trim();

        issues.push({
          severity: p.severity,
          pattern: p.label,
          location: sentence.slice(0, 100),
          fix: p.fix,
        });
      }
    }

    // 2. Structural checks
    issues.push(...checkStructuralRedFlags(content, answerType));

    // 3. Content-specific checks
    issues.push(...checkContentRedFlags(content, answerType));
  }

  // Seniority calibration: senior candidates get stricter checks
  if (seniority === "senior") {
    for (const issue of issues) {
      if (issue.severity === "warning" && /cliche|generic|passive/i.test(issue.fix)) {
        issue.severity = "critical";
      }
    }
  }

  // Deduplicate by pattern
  const seen = new Set<string>();
  const deduped = issues.filter((i) => {
    if (seen.has(i.pattern)) return false;
    seen.add(i.pattern);
    return true;
  });

  // Sort: critical → warning → suggestion
  const severityOrder = { critical: 0, warning: 1, suggestion: 2 };
  deduped.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  const criticalCount = deduped.filter((i) => i.severity === "critical").length;
  const warningCount = deduped.filter((i) => i.severity === "warning").length;
  const suggestionCount = deduped.filter((i) => i.severity === "suggestion").length;

  // Build coaching tips from warnings
  const coachingTips = deduped
    .filter((i) => i.severity === "warning")
    .map((i) => i.fix);

  // Build correction prompt for regeneration
  let correctionPrompt: string | null = null;
  if (criticalCount > 0) {
    const criticals = deduped.filter((i) => i.severity === "critical");
    const corrections = criticals
      .map((i) => `- REMOVE: ${i.pattern}. Instead: ${i.fix}`)
      .join("\n");
    correctionPrompt = `QUALITY CORRECTION — the previous answer contained ${criticalCount} disqualifying pattern(s) that hiring managers flag as instant credibility killers. Fix ALL of these:\n${corrections}\n\nRegenerate the ENTIRE answer with these corrections applied. Do not just patch the flagged sentences — rewrite naturally so the corrections flow with the rest of the answer.`;
  }

  return {
    issues: deduped,
    criticalCount,
    warningCount,
    suggestionCount,
    coachingTips,
    shouldRegenerate: criticalCount > 0,
    correctionPrompt,
  };
}

// ── Logging ───────────────────────────────────────────────────────────────────

/**
 * Log quality check results for tracking prompt quality over time.
 * Fire-and-forget — errors are swallowed.
 */
export async function logQualityCheck(params: {
  answerId: string;
  answerType: string;
  issues: QualityIssue[];
  criticalCount: number;
  warningCount: number;
  wasRegenerated: boolean;
}): Promise<void> {
  try {
    const db = createAdminClient();
    await db.from("answer_quality_checks").insert({
      answer_id: params.answerId,
      answer_type: params.answerType,
      issues_found: params.issues,
      critical_count: params.criticalCount,
      warning_count: params.warningCount,
      was_regenerated: params.wasRegenerated,
    });
  } catch (err) {
    console.warn("Failed to log quality check (non-fatal):", err);
  }
}
