/**
 * Self-contained verification for the static fallback interrogation set.
 * No Anthropic calls, no Supabase writes. Confirms:
 *   - getFallbackInterrogationLines returns the expected count per role
 *   - every line passes InterrogationLineSchema
 *   - every free-text field passes the manual banned-phrase scan
 *     (mirrors src/lib/ai/quality-check.ts RED_FLAG_PHRASES)
 *
 * Usage:
 *   npx tsx scripts/verify-fallback-interrogation.ts
 */

import { Module } from "module";
import { resolve as resolvePath } from "path";

// Shim server-only so we can import the engine modules outside Next.js.
const EMPTY_PATH = resolvePath(process.cwd(), "node_modules/server-only/empty.js");
const _origResolve = (Module as unknown as { _resolveFilename: (req: string, parent: unknown, ...rest: unknown[]) => string })._resolveFilename;
(Module as unknown as { _resolveFilename: (req: string, parent: unknown, ...rest: unknown[]) => string })._resolveFilename = function (
  request: string,
  parent: unknown,
  ...rest: unknown[]
) {
  if (request === "server-only") return EMPTY_PATH;
  return _origResolve.call(this, request, parent, ...rest);
};

import { getFallbackInterrogationLines } from "../src/lib/positioning/fallback-interrogation";
import { InterrogationLineSchema } from "../src/lib/types/schemas";
import type { InterviewStage, RoleType } from "../src/types";

const RED_FLAGS: RegExp[] = [
  /\bi am passionate about\b/i,
  /\bi(?:'m| am) passionate\b/i,
  /\bthrive in (?:a )?fast[- ]paced environments?\b/i,
  /\bi am a hard worker\b/i,
  /\bi(?:'m| am) a quick learner\b/i,
  /\bthroughout my career\b/i,
  /\bi believe my experience\b/i,
  /\bbring [\w\s]+ to the table\b/i,
  /\bdetail[- ]oriented\b/i,
  /\bresults[- ]driven\b/i,
  /\bself[- ]starter\b/i,
  /\bsynerg(?:y|ies|ize)\b/i,
  /\butilize\b/i,
  /\bleverage(?:d)?\b/i,
  /\bfurthermore\b/i,
  /\bmoreover\b/i,
  /\badditionally\b/i,
];

function scanBannedPhrases(text: string, location: string): string[] {
  const hits: string[] = [];
  for (const re of RED_FLAGS) {
    const m = text.match(re);
    if (m) hits.push(`${location}: "${m[0]}" (pattern ${re})`);
  }
  return hits;
}

const STAGES: InterviewStage[] = ["recruiter", "hiring_manager", "role_play", "panel", "take_home"];
const ROLES: RoleType[] = ["sdr_bdr", "account_executive", "account_manager_csm", "other_sales"];

let totalLines = 0;
let totalSchemaErrors = 0;
let totalBannedHits = 0;

for (const stage of STAGES) {
  for (const role of ROLES) {
    const lines = getFallbackInterrogationLines(stage, role);
    if (lines.length !== 5) {
      console.error(`✗ ${stage}/${role}: expected 5 lines, got ${lines.length}`);
      totalSchemaErrors++;
    }
    lines.forEach((line, i) => {
      totalLines++;
      const parsed = InterrogationLineSchema.safeParse(line);
      if (!parsed.success) {
        console.error(`✗ ${stage}/${role} line[${i}] schema invalid:`, parsed.error.issues);
        totalSchemaErrors++;
      }
      const fields = [
        { text: line.question, loc: `question` },
        { text: line.why_it_matters, loc: `why_it_matters` },
        { text: line.star_slot_hint, loc: `star_slot_hint` },
        { text: line.directionality_note, loc: `directionality_note` },
      ];
      for (const f of fields) {
        const hits = scanBannedPhrases(f.text, `${stage}/${role}/line[${i}].${f.loc}`);
        if (hits.length) {
          totalBannedHits += hits.length;
          for (const h of hits) console.error("✗ BANNED PHRASE:", h);
        }
      }
    });
  }
}

console.log("\n━━━ Verification summary ━━━");
console.log(`Stage×role combos exercised: ${STAGES.length * ROLES.length}`);
console.log(`Total lines scanned:         ${totalLines}`);
console.log(`Schema errors:               ${totalSchemaErrors}`);
console.log(`Banned-phrase hits:          ${totalBannedHits}`);

if (totalSchemaErrors === 0 && totalBannedHits === 0) {
  console.log("\n✓ All fallback lines pass schema + voice-check.");
} else {
  process.exit(1);
}

// Print one sample bundle for visual review (account_executive +
// hiring_manager — the most common live combo).
console.log("\n━━━ Sample: hiring_manager / account_executive ━━━");
const sample = getFallbackInterrogationLines("hiring_manager", "account_executive");
sample.forEach((line, i) => {
  console.log(`\n[${i + 1}] ${line.question}`);
  console.log(`    why_it_matters: ${line.why_it_matters}`);
  console.log(`    targets: ${line.targets.join(", ")}`);
  console.log(`    star_slot_hint: ${line.star_slot_hint}`);
  console.log(`    directionality_note: ${line.directionality_note}`);
});
