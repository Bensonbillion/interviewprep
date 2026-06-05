import { describe, it, expect } from "vitest";
import { getFallbackInterrogationLines } from "@/lib/positioning/fallback-interrogation";
import { InterrogationLineSchema } from "@/lib/types/schemas";
import type { InterviewStage, RoleType } from "@/types";

const STAGES: InterviewStage[] = ["recruiter", "hiring_manager", "role_play", "panel", "take_home"];
const ROLES: RoleType[] = ["sdr_bdr", "account_executive", "account_manager_csm", "other_sales"];

// Mirrors RED_FLAG_PHRASES in src/lib/ai/quality-check.ts. The static
// fallback bank bypasses the live Haiku QC pass, so this test is the
// authoritative voice-check gate. If a new fallback question trips one
// of these, the test fails and we keep them out of production.
const BANNED_PHRASES: RegExp[] = [
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

describe("getFallbackInterrogationLines", () => {
  it("returns exactly 5 lines for every (stage, roleType) combo", () => {
    for (const stage of STAGES) {
      for (const role of ROLES) {
        const lines = getFallbackInterrogationLines(stage, role);
        expect(lines.length, `${stage}/${role}`).toBe(5);
      }
    }
  });

  it("every returned line passes InterrogationLineSchema", () => {
    for (const stage of STAGES) {
      for (const role of ROLES) {
        const lines = getFallbackInterrogationLines(stage, role);
        lines.forEach((line, i) => {
          const parsed = InterrogationLineSchema.safeParse(line);
          expect(parsed.success, `${stage}/${role} line[${i}] schema: ${!parsed.success ? JSON.stringify(parsed.error.issues) : ""}`).toBe(true);
        });
      }
    }
  });

  it("every free-text field is free of RED_FLAG_PHRASES", () => {
    for (const stage of STAGES) {
      for (const role of ROLES) {
        const lines = getFallbackInterrogationLines(stage, role);
        lines.forEach((line, i) => {
          const fields = [
            { name: "question", text: line.question },
            { name: "why_it_matters", text: line.why_it_matters },
            { name: "star_slot_hint", text: line.star_slot_hint },
            { name: "directionality_note", text: line.directionality_note },
          ];
          for (const f of fields) {
            for (const re of BANNED_PHRASES) {
              expect(
                re.test(f.text),
                `${stage}/${role} line[${i}].${f.name} hit banned phrase ${re}: "${f.text}"`
              ).toBe(false);
            }
          }
        });
      }
    }
  });

  it("the 5th slot is role-flavored when a swap exists for the roleType", () => {
    // CORE[0..3] are universal; CORE[4] is the universal-flavored
    // fallback used when no role swap exists. Swaps exist for all 4
    // roles, so the universal default is never reached today — verify
    // the swap names the role in some way.
    const sdrLine5 = getFallbackInterrogationLines("hiring_manager", "sdr_bdr")[4];
    expect(sdrLine5.directionality_note.toLowerCase()).toContain("sdr");

    const aeLine5 = getFallbackInterrogationLines("hiring_manager", "account_executive")[4];
    expect(aeLine5.directionality_note.toLowerCase()).toContain("ae");

    const csmLine5 = getFallbackInterrogationLines("hiring_manager", "account_manager_csm")[4];
    expect(csmLine5.directionality_note.toLowerCase()).toMatch(/csm|am/);

    const otherLine5 = getFallbackInterrogationLines("hiring_manager", "other_sales")[4];
    expect(otherLine5.question.toLowerCase()).toContain("sales-like");
  });

  it("stage does not change the returned set today (stage-agnostic by design)", () => {
    // We accept stage in the signature so future stage tuning is a
    // non-breaking change — but the current behavior is identical
    // across stages. Pin that so a future change to the picker is a
    // deliberate, reviewable diff rather than an accidental one.
    const role: RoleType = "account_executive";
    const reference = getFallbackInterrogationLines("hiring_manager", role).map((l) => l.question);
    for (const stage of STAGES) {
      const lines = getFallbackInterrogationLines(stage, role).map((l) => l.question);
      expect(lines).toEqual(reference);
    }
  });

  it("question text never opens with the AI-pattern 'As a' or 'I am a'", () => {
    // Structural check from src/lib/ai/quality-check.ts applied to
    // questions (not answers). Catches a fallback question that drifts
    // into an instruction-style preamble.
    for (const stage of STAGES) {
      for (const role of ROLES) {
        const lines = getFallbackInterrogationLines(stage, role);
        for (const line of lines) {
          expect(/^(?:As a |I am a )/i.test(line.question.trim())).toBe(false);
        }
      }
    }
  });
});
