import { describe, it, expect } from "vitest";
import { STAGE_SLOT_MAP, STAGE_TYPE_METADATA, type StageType } from "@/lib/types/stages";

const ALL_STAGE_TYPES: StageType[] = [
  "conversational",
  "deep_dive",
  "skills_demo",
  "take_home",
  "presentation_defense",
  "panel_executive",
];

describe("STAGE_SLOT_MAP", () => {
  it("has entries for all 6 stage types", () => {
    ALL_STAGE_TYPES.forEach((type) => {
      expect(STAGE_SLOT_MAP[type]).toBeDefined();
      expect(STAGE_SLOT_MAP[type].length).toBeGreaterThan(0);
    });
  });

  it("each slot has required fields", () => {
    ALL_STAGE_TYPES.forEach((type) => {
      STAGE_SLOT_MAP[type].forEach((slot) => {
        expect(slot.answer_type).toBeTruthy();
        expect(slot.label).toBeTruthy();
        expect(slot.description).toBeTruthy();
      });
    });
  });

  it("each stage has at least one free card", () => {
    ALL_STAGE_TYPES.forEach((type) => {
      const freeCards = STAGE_SLOT_MAP[type].filter((s) => s.is_free);
      expect(freeCards.length).toBeGreaterThanOrEqual(1);
    });
  });

  it("conversational has different cards from panel_executive", () => {
    const convTypes = STAGE_SLOT_MAP.conversational.map((s) => s.answer_type);
    const panelTypes = STAGE_SLOT_MAP.panel_executive.map((s) => s.answer_type);

    const convOnlyTypes = convTypes.filter((t) => !panelTypes.includes(t));
    const panelOnlyTypes = panelTypes.filter((t) => !convTypes.includes(t));

    expect(convOnlyTypes.length).toBeGreaterThan(0);
    expect(panelOnlyTypes.length).toBeGreaterThan(0);
  });

  it("take_home has output-generator cards not in other stages", () => {
    const takeHomeTypes = STAGE_SLOT_MAP.take_home.map((s) => s.answer_type);
    expect(takeHomeTypes).toContain("icp_definition");
    expect(takeHomeTypes).toContain("prospecting_targets");
    expect(takeHomeTypes).toContain("cold_email_draft");
    expect(takeHomeTypes).toContain("discovery_questions");
  });

  it("presentation_defense has weakness_audit", () => {
    const defenseTypes = STAGE_SLOT_MAP.presentation_defense.map((s) => s.answer_type);
    expect(defenseTypes).toContain("weakness_audit");
    expect(defenseTypes).toContain("defense_questions");
  });

  it("skills_demo has coachability_coaching", () => {
    const demoTypes = STAGE_SLOT_MAP.skills_demo.map((s) => s.answer_type);
    expect(demoTypes).toContain("coachability_coaching");
    expect(demoTypes).toContain("role_play_script");
  });
});

describe("STAGE_TYPE_METADATA", () => {
  it("has metadata for all 6 types", () => {
    ALL_STAGE_TYPES.forEach((type) => {
      expect(STAGE_TYPE_METADATA[type]).toBeDefined();
      expect(STAGE_TYPE_METADATA[type].label).toBeTruthy();
      expect(STAGE_TYPE_METADATA[type].description).toBeTruthy();
      expect(STAGE_TYPE_METADATA[type].cheat_sheet_framing).toBeTruthy();
      expect(STAGE_TYPE_METADATA[type].example_names.length).toBeGreaterThan(0);
    });
  });
});
