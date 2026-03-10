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
