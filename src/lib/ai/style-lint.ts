/**
 * Deterministic post-processing style checks.
 * Runs AFTER generation (and humanization if applicable) as a cheap safety net
 * to catch AI patterns the prompt rules miss.
 *
 * Does NOT change meaning — only surface-level style fixes.
 *
 * @param text   The generated answer text
 * @param isSpoken  true for spoken answer types, false for reference material
 */
export function styleLint(text: string, isSpoken: boolean): string {
  let result = text;

  // === ALWAYS (both spoken and reference) ===

  // Kill banned transitions
  result = result.replace(/\bFurthermore,?\s*/gi, 'And ');
  result = result.replace(/\bMoreover,?\s*/gi, 'Also, ');
  result = result.replace(/\bAdditionally,?\s*/gi, 'And ');
  result = result.replace(/\bConsequently,?\s*/gi, 'So ');
  result = result.replace(/\bIt is (important|worth) (to note|noting) that\s*/gi, '');
  result = result.replace(/\bIn today's fast-paced world,?\s*/gi, '');

  // Kill banned words (replace with simpler alternatives)
  const bannedWords: Array<[RegExp, string]> = [
    [/\bleverage[ds]?\b/gi, 'use'],
    [/\butilize[ds]?\b/gi, 'use'],
    [/\boptimize[ds]?\b/gi, 'improve'],
    [/\bfacilitate[ds]?\b/gi, 'help'],
    [/\brobust\b/gi, 'strong'],
    [/\bstreamline[ds]?\b/gi, 'simplify'],
    [/\binnovative\b/gi, 'new'],
    [/\bgroundbreaking\b/gi, 'major'],
    [/\btransformative\b/gi, 'significant'],
    [/\bseamless(ly)?\b/gi, 'smooth$1'],
    [/\bcutting-edge\b/gi, 'modern'],
    [/\bsynerg(y|ies)\b/gi, 'teamwork'],
    [/\bpivotal\b/gi, 'key'],
  ];
  for (const [pattern, replacement] of bannedWords) {
    result = result.replace(pattern, replacement);
  }

  // Kill banned phrases
  result = result.replace(/\bI am passionate about\b/gi, "I care about");
  result = result.replace(/\bresults-driven\b/gi, "focused on numbers");
  result = result.replace(/\bproven track record\b/gi, "track record");
  result = result.replace(/\bdemonstrated ability to\b/gi, "experience in");

  // ==========================================
  // HUMANIZER PATTERNS (from Wikipedia's
  // "Signs of AI Writing" — 24 patterns)
  // ==========================================

  // --- PATTERN 1: Significance inflation ---
  const significancePatterns: [RegExp, string][] = [
    [/\bstands as\b/gi, 'is'],
    [/\bserves as\b/gi, 'is'],
    [/\bmarks a (pivotal|key|crucial|significant) (moment|shift|turning point)\b/gi, ''],
    [/\bis a testament to\b/gi, 'shows'],
    [/\bis a reminder (of|that)\b/gi, 'shows'],
    [/\bplays a (vital|significant|crucial|pivotal|key) role\b/gi, 'matters'],
    [/\bunderscores? (its |the )?(importance|significance)\b/gi, 'matters'],
    [/\bhighlights? (its |the )?(importance|significance)\b/gi, 'shows'],
    [/\breflects? broader\b/gi, 'relates to'],
    [/\bsymboliz(es?|ing) (its |the )?(ongoing|enduring|lasting)\b/gi, ''],
    [/\bsetting the stage for\b/gi, 'leading to'],
    [/\bmarks? a shift\b/gi, 'changes'],
    [/\bevolving landscape\b/gi, 'industry'],
    [/\bindelible mark\b/gi, 'impact'],
    [/\bdeeply rooted\b/gi, 'strong'],
    [/\bfocal point\b/gi, 'center'],
  ];

  // --- PATTERN 3: Superficial -ing analyses ---
  const ingPatterns: [RegExp, string][] = [
    [/,?\s*highlighting\b[^.]{0,60}\./gi, '.'],
    [/,?\s*underscoring\b[^.]{0,60}\./gi, '.'],
    [/,?\s*emphasizing\b[^.]{0,60}\./gi, '.'],
    [/,?\s*reflecting\b[^.]{0,40}\./gi, '.'],
    [/,?\s*symbolizing\b[^.]{0,40}\./gi, '.'],
    [/,?\s*showcasing\b[^.]{0,60}\./gi, '.'],
    [/,?\s*cultivating\b[^.]{0,40}\./gi, '.'],
    [/,?\s*fostering\b[^.]{0,40}\./gi, '.'],
    [/,?\s*encompassing\b[^.]{0,40}\./gi, '.'],
    [/,?\s*contributing to\b[^.]{0,40}\./gi, '.'],
    [/,?\s*ensuring\b[^.]{0,40}\./gi, '.'],
  ];

  // --- PATTERN 4: Promotional language ---
  const promotionalPatterns: [RegExp, string][] = [
    [/\bboasts a\b/gi, 'has a'],
    [/\bvibrant\b/gi, 'active'],
    [/\bprofound\b/gi, 'deep'],
    [/\benhancing its\b/gi, 'improving its'],
    [/\bexemplifies\b/gi, 'shows'],
    [/\bcommitment to\b/gi, 'focus on'],
    [/\bnestled\b/gi, 'located'],
    [/\bin the heart of\b/gi, 'in central'],
    [/\brenowned\b/gi, 'well-known'],
    [/\bbreathtaking\b/gi, 'impressive'],
    [/\bmust-visit\b/gi, 'worth visiting'],
    [/\bstunning\b/gi, 'strong'],
  ];

  // --- PATTERN 7: Overused AI vocabulary ---
  const aiVocabPatterns: [RegExp, string][] = [
    [/\balign(s|ed|ing)? with\b/gi, 'match'],
    [/\bcrucial\b/gi, 'important'],
    [/\bdelve(s|d)?\b/gi, 'look into'],
    [/\benduring\b/gi, 'lasting'],
    [/\bgarner(s|ed)?\b/gi, 'get'],
    [/\bintricate(s)?\b/gi, 'complex'],
    [/\bintricacies\b/gi, 'details'],
    [/\blandscape\b(?!\s*(design|architect))/gi, 'space'],
    [/\btapestry\b/gi, 'mix'],
    [/\bunderscore(s|d)?\b/gi, 'show'],
    [/\bvaluable\b/gi, 'useful'],
  ];

  // --- PATTERN 8: Copula avoidance ---
  const copulaPatterns: [RegExp, string][] = [
    [/\bserves as (a |an |the )/gi, 'is $1'],
    [/\bstands as (a |an |the )/gi, 'is $1'],
    [/\bfunctions as (a |an |the )/gi, 'is $1'],
    [/\bacts as (a |an |the )/gi, 'is $1'],
    [/\brepresents (a |an |the )/gi, 'is $1'],
    [/\bfeatures (a |an )/gi, 'has $1'],
    [/\bboasts (a |an )/gi, 'has $1'],
    [/\boffers (a |an )/gi, 'has $1'],
  ];

  // --- PATTERN 9: Negative parallelisms ---
  const negParallelPatterns: [RegExp, string][] = [
    [/It's not just about ([^;]+); it's (about |really )?/gi, "It's $1 and "],
    [/Not only ([^,]+), but (also )?/gi, '$1 and '],
    [/It's not merely ([^,]+), it's /gi, "It's "],
  ];

  // --- PATTERN 22: Filler phrases ---
  const fillerPatterns: [RegExp, string][] = [
    [/\bIn order to\b/gi, 'To'],
    [/\bDue to the fact that\b/gi, 'Because'],
    [/\bAt this point in time\b/gi, 'Now'],
    [/\bIn the event that\b/gi, 'If'],
    [/\bhas the ability to\b/gi, 'can'],
    [/\bIt is important to note that\b/gi, ''],
    [/\bIt is worth noting that\b/gi, ''],
    [/\bAt its core,?\s*/gi, ''],
    [/\bIn today's (rapidly )?(evolving |changing )?/gi, 'In the current '],
    [/\bThe reality is that\b/gi, ''],
    [/\bIt goes without saying that\b/gi, ''],
    [/\bNeedless to say,?\s*/gi, ''],
    [/\bAs a matter of fact,?\s*/gi, ''],
  ];

  // --- PATTERN 23: Excessive hedging ---
  const hedgingPatterns: [RegExp, string][] = [
    [/\bcould potentially\b/gi, 'could'],
    [/\bmight possibly\b/gi, 'might'],
    [/\bit could be argued that\b/gi, ''],
    [/\bit is possible that\b/gi, 'possibly'],
    [/\bWhile specific details are limited[^,]*,\s*/gi, ''],
    [/\bBased on available information,?\s*/gi, ''],
  ];

  // --- PATTERN 24: Generic positive conclusions ---
  const genericConclusionPatterns: [RegExp, string][] = [
    [/\bThe future looks bright\b[^.]*\./gi, ''],
    [/\bExciting times lie ahead\b[^.]*\./gi, ''],
    [/\bcontinue (this |our |their )?journey toward\b/gi, 'work toward'],
    [/\bmarks? a (major )?step in the right direction\b/gi, 'is progress'],
  ];

  // Apply all humanizer pattern groups
  const allHumanizerPatterns = [
    ...significancePatterns,
    ...ingPatterns,
    ...promotionalPatterns,
    ...aiVocabPatterns,
    ...copulaPatterns,
    ...negParallelPatterns,
    ...fillerPatterns,
    ...hedgingPatterns,
    ...genericConclusionPatterns,
  ];
  for (const [pattern, replacement] of allHumanizerPatterns) {
    result = result.replace(pattern, replacement);
  }

  // --- PATTERN 13: Em dash overuse ---
  result = fixEmDashOveruse(result);

  // --- PATTERN 10: Rule of three (abstract nouns) ---
  if (hasRuleOfThree(result)) {
    // Flag but don't auto-fix — the regex replacements above
    // already handle the worst offenders via vocabulary patterns
  }

  // Clean up artifacts from removals (double spaces, orphaned commas/periods)
  result = result.replace(/\s{2,}/g, ' ');
  result = result.replace(/,\s*,/g, ',');
  result = result.replace(/\.\s*\./g, '.');
  result = result.replace(/^\s+/gm, '');

  // === SPOKEN TYPES ONLY ===
  if (isSpoken) {
    // Add contractions
    const contractions: Array<[RegExp, string]> = [
      [/\bI am\b/g, "I'm"],
      [/\bdo not\b/g, "don't"],
      [/\bcan not\b/g, "can't"],
      [/\bcannot\b/g, "can't"],
      [/\bwill not\b/g, "won't"],
      [/\bit is\b/g, "it's"],
      [/\bthat is\b/g, "that's"],
      [/\bI have\b(?! to\b)/g, "I've"], // not "I have to"
      [/\bI would\b/g, "I'd"],
      [/\bwas not\b/g, "wasn't"],
      [/\bdid not\b/g, "didn't"],
    ];
    for (const [pattern, replacement] of contractions) {
      result = result.replace(pattern, replacement);
    }

    // Remove formal openings
    result = result.replace(
      /^(Thank you for (the opportunity|asking|that question|this question)[.,]?\s*)/i,
      ''
    );
    result = result.replace(
      /^(I (am excited|appreciate the opportunity) to\b.*?\.\s*)/i,
      ''
    );
  }

  return result;
}

// --- PATTERN 13 helper: Em dash overuse ---
function fixEmDashOveruse(text: string): string {
  const dashes = (text.match(/—/g) || []).length;
  if (dashes <= 1) return text;

  let count = 0;
  return text.replace(/—/g, () => {
    count++;
    if (count <= 1) return '—'; // keep first one
    return ','; // replace subsequent with comma
  });
}

// --- PATTERN 10 helper: Rule of three detection ---
function hasRuleOfThree(text: string): boolean {
  const abstractWords = [
    'innovation', 'inspiration', 'insight', 'excellence', 'integrity',
    'collaboration', 'creativity', 'efficiency', 'transparency',
    'accountability', 'sustainability', 'empowerment', 'transformation',
    'resilience', 'agility', 'alignment', 'engagement', 'inclusion',
    'diversity',
  ];

  const threePattern = /(\w+),\s+(\w+),\s+and\s+(\w+)/gi;
  let match;
  while ((match = threePattern.exec(text)) !== null) {
    const words = [match[1], match[2], match[3]].map(w => w.toLowerCase());
    const abstractCount = words.filter(w => abstractWords.includes(w)).length;
    if (abstractCount >= 2) return true;
  }
  return false;
}
