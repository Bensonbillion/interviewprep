import { describe, it, expect } from "vitest";
import { buildAnswerSlots, ANSWER_LABELS } from "@/lib/session/answer-slots";

// ── buildAnswerSlots ────────────────────────────────────────────────────

describe("buildAnswerSlots", () => {
  // ── Stage mapping ─────────────────────────────────────────────────────

  it("returns 7 slots for recruiter stage", () => {
    const slots = buildAnswerSlots("recruiter", "experienced_rep");
    expect(slots).toHaveLength(7);
    expect(slots.map((s) => s.type)).toEqual([
      "tell_me_about_yourself",
      "why_sales",
      "why_this_company",
      "comp_expectations",
      "questions_to_ask",
      "company_brief",
      "cheat_sheet",
    ]);
  });

  it("returns 9 slots for hiring_manager stage", () => {
    const slots = buildAnswerSlots("hiring_manager", "experienced_rep");
    expect(slots).toHaveLength(9);
    expect(slots.map((s) => s.type)).toContain("resume_walkthrough");
    expect(slots.map((s) => s.type)).toContain("constructive_feedback");
    expect(slots.map((s) => s.type)).toContain("competitor_battle_card");
  });

  it("returns 6 slots for role_play stage", () => {
    const slots = buildAnswerSlots("role_play", "experienced_rep");
    expect(slots).toHaveLength(6);
    expect(slots.map((s) => s.type)).toContain("coachability_game_plan");
    expect(slots.map((s) => s.type)).toContain("role_play_script");
    expect(slots.map((s) => s.type)).toContain("objection_response");
    expect(slots.map((s) => s.type)).toContain("coachability_coaching");
  });

  it("returns 5 slots for panel stage", () => {
    const slots = buildAnswerSlots("panel", "experienced_rep");
    expect(slots).toHaveLength(5);
    expect(slots.map((s) => s.type)).toContain("behavioral_star");
    expect(slots.map((s) => s.type)).toContain("questions_to_ask");
  });

  it("returns 5 slots for take_home stage", () => {
    const slots = buildAnswerSlots("take_home", "experienced_rep");
    expect(slots).toHaveLength(5);
    expect(slots.map((s) => s.type)).toContain("cold_email");
    expect(slots.map((s) => s.type)).toContain("pain_point_analysis");
    expect(slots.map((s) => s.type)).toContain("assignment_guide");
  });

  // ── Slot structure ────────────────────────────────────────────────────

  it("each slot has type, label, description, and status", () => {
    const slots = buildAnswerSlots("recruiter", "experienced_rep");
    for (const slot of slots) {
      expect(slot).toHaveProperty("type");
      expect(slot).toHaveProperty("label");
      expect(slot).toHaveProperty("description");
      expect(slot).toHaveProperty("status");
      expect(typeof slot.label).toBe("string");
      expect(typeof slot.description).toBe("string");
      expect(slot.label.length).toBeGreaterThan(0);
      expect(slot.description.length).toBeGreaterThan(0);
    }
  });

  it("all slots have status 'loading'", () => {
    const slots = buildAnswerSlots("recruiter", "experienced_rep");
    for (const slot of slots) {
      expect(slot.status).toBe("loading");
    }
  });

  // ── Career switcher additions ─────────────────────────────────────────

  it("adds career_switcher_bridge for career_switcher background", () => {
    const slots = buildAnswerSlots("recruiter", "career_switcher");
    const types = slots.map((s) => s.type);
    expect(types).toContain("career_switcher_bridge");
  });

  it("does not add career_switcher_bridge for experienced_rep", () => {
    const slots = buildAnswerSlots("recruiter", "experienced_rep");
    const types = slots.map((s) => s.type);
    expect(types).not.toContain("career_switcher_bridge");
  });

  it("career_switcher_bridge is appended after base types (no duplicates)", () => {
    const slots = buildAnswerSlots("recruiter", "career_switcher");
    // Should have 7 base + 1 extra = 8
    expect(slots).toHaveLength(8);
    // Last item should be the career switcher bridge
    expect(slots[slots.length - 1].type).toBe("career_switcher_bridge");
  });

  // ── AE label overrides ────────────────────────────────────────────────

  it("applies AE label overrides for account_executive role", () => {
    const slots = buildAnswerSlots("recruiter", "experienced_rep", "account_executive");
    const whySales = slots.find((s) => s.type === "why_sales");
    expect(whySales?.label).toBe("Why This Move?");
  });

  it("applies AE behavioral_star override for hiring_manager stage", () => {
    const slots = buildAnswerSlots("hiring_manager", "experienced_rep", "account_executive");
    const behavioral = slots.find((s) => s.type === "behavioral_star");
    expect(behavioral?.label).toBe("Deal STAR Stories");
  });

  it("applies AE role_play_script override for role_play stage", () => {
    const slots = buildAnswerSlots("role_play", "experienced_rep", "account_executive");
    const rolePlay = slots.find((s) => s.type === "role_play_script");
    expect(rolePlay?.label).toBe("Discovery Demo Script");
  });

  it("applies AE objection_response override for role_play stage", () => {
    const slots = buildAnswerSlots("role_play", "experienced_rep", "account_executive");
    const objection = slots.find((s) => s.type === "objection_response");
    expect(objection?.label).toBe("Executive Objection Responses");
  });

  it("does not apply AE overrides for sdr_bdr role", () => {
    const slots = buildAnswerSlots("recruiter", "experienced_rep", "sdr_bdr");
    const whySales = slots.find((s) => s.type === "why_sales");
    expect(whySales?.label).toBe("Why Sales?");
  });

  it("does not apply AE overrides when roleType is undefined", () => {
    const slots = buildAnswerSlots("recruiter", "experienced_rep");
    const whySales = slots.find((s) => s.type === "why_sales");
    expect(whySales?.label).toBe("Why Sales?");
  });

  // ── ANSWER_LABELS export ──────────────────────────────────────────────

  it("ANSWER_LABELS has entries for all answer types used in slots", () => {
    const allStages = ["recruiter", "hiring_manager", "role_play", "panel", "take_home"] as const;
    const allTypes = new Set<string>();
    for (const stage of allStages) {
      const slots = buildAnswerSlots(stage, "experienced_rep");
      for (const slot of slots) {
        allTypes.add(slot.type);
      }
    }
    for (const type of allTypes) {
      expect(ANSWER_LABELS[type as keyof typeof ANSWER_LABELS], `Missing label for ${type}`).toBeDefined();
    }
  });
});
