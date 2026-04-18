import { describe, it, expect } from "vitest";
import { renderAnswerContent } from "@/lib/render/render-answer-content";

describe("renderAnswerContent", () => {
  describe("markdown detection", () => {
    it("returns markdown type for plain text answers", () => {
      const result = renderAnswerContent(
        "Yeah so the short version is I have been in SaaS sales for two years.",
        "tell_me_about_yourself"
      );
      expect(result.type).toBe("markdown");
    });

    it("strips markdown code fences before parsing JSON", () => {
      const json = JSON.stringify([{ question: "Q1", model_answer: "A1" }]);
      const wrapped = `\`\`\`json\n${json}\n\`\`\``;
      const result = renderAnswerContent(wrapped, "defense_questions");
      expect(result.type).toBe("question_list");
    });

    it("handles text with markdown formatting", () => {
      const result = renderAnswerContent(
        "**Important:** Make sure to mention numbers.\n\n- Quota attainment\n- Deal size",
        "cheat_sheet"
      );
      // Falls through to markdown since it's not valid JSON
      expect(result.type).toBe("markdown");
    });
  });

  describe("weakness_audit", () => {
    it("parses array of weak spots", () => {
      const content = JSON.stringify([
        {
          area: "ICP size range",
          severity: "high",
          likely_question: "Why these three utility sizes?",
          model_answer: "I led with situation over size...",
          trap_to_avoid: "Don't say I just found good companies",
        },
      ]);
      const result = renderAnswerContent(content, "weakness_audit");
      expect(result.type).toBe("weak_spots");
      if (result.type === "weak_spots") {
        expect(result.items).toHaveLength(1);
        expect(result.items[0].severity).toBe("high");
        expect(result.items[0].likely_question).toBeTruthy();
        expect(result.items[0].model_answer).toBeTruthy();
      }
    });

    it("parses object with weak_spots array", () => {
      const content = JSON.stringify({
        weak_spots: [
          { area: "Email opener", severity: "medium", likely_question: "Why lead with PFAS?", model_answer: "Answer" },
        ],
        overall_assessment: "Strong overall",
        strongest_element: "Court filing research",
      });
      const result = renderAnswerContent(content, "weakness_audit");
      expect(result.type).toBe("weak_spots");
      if (result.type === "weak_spots") {
        expect(result.items).toHaveLength(1);
      }
    });

    it("returns markdown type for malformed JSON", () => {
      const result = renderAnswerContent("{broken json}}}", "weakness_audit");
      expect(result.type).toBe("markdown");
    });
  });

  describe("defense_questions", () => {
    it("parses question array", () => {
      const content = JSON.stringify([
        {
          question: "Why Louisville Water specifically?",
          asked_by: "Jessica Galati",
          what_theyre_testing: "Research methodology",
          model_answer: "Louisville Water had the highest urgency signal...",
          trap_to_avoid: 'Don\'t say "I just found good companies"',
        },
      ]);
      const result = renderAnswerContent(content, "defense_questions");
      expect(result.type).toBe("question_list");
      if (result.type === "question_list") {
        expect(result.items[0].question).toBeTruthy();
        expect(result.items[0].model_answer).toBeTruthy();
        expect(result.items[0].asked_by).toBe("Jessica Galati");
      }
    });
  });

  describe("cheat_sheet", () => {
    it("parses points array with permission_to_stop", () => {
      const content = JSON.stringify({
        points: [
          { point: "Lead with your process", detail: "Jessica knows the ICP", who_its_for: "jessica" },
          { point: "The coachability moment is the evaluation", detail: "Hold your position", who_its_for: "jessica" },
        ],
        permission_to_stop: "You are prepared. Close the laptop and sleep.",
      });
      const result = renderAnswerContent(content, "cheat_sheet");
      expect(result.type).toBe("cheat_points");
      if (result.type === "cheat_points") {
        expect(result.items).toHaveLength(2);
        expect(result.permission_to_stop).toBe("You are prepared. Close the laptop and sleep.");
      }
    });
  });

  describe("cold_email_draft", () => {
    it("parses email with subject and body", () => {
      const content = JSON.stringify({
        subject: "Louisville Water's PFAS",
        body: "Hey Chris,\n\nSaw that you...",
        personalization_rationale: "Court filing reference",
        alternative_subjects: ["PFAS Monitoring at Louisville Water"],
      });
      const result = renderAnswerContent(content, "cold_email_draft");
      expect(result.type).toBe("email");
      if (result.type === "email") {
        expect(result.subject).toBeTruthy();
        expect(result.body).toContain("Chris");
      }
    });
  });

  describe("discovery_questions", () => {
    it("parses discovery question array", () => {
      const content = JSON.stringify([
        {
          question: "Walk me through how your team manages compliance today",
          category: "current_state",
          what_it_uncovers: "Current stack and manual workarounds",
        },
      ]);
      const result = renderAnswerContent(content, "discovery_questions");
      expect(result.type).toBe("discovery_questions");
      if (result.type === "discovery_questions") {
        expect(result.items[0].question).toBeTruthy();
        expect(result.items[0].category).toBe("current_state");
      }
    });
  });

  describe("icp_definition", () => {
    it("parses ICP data", () => {
      const content = JSON.stringify({
        org_types: ["Municipal water utilities", "Regional water authorities"],
        pain_points: ["Scattered compliance data", "Manual DMR reporting"],
        decision_makers: ["Compliance Manager", "VP Operations"],
        anti_icp: ["Private utilities without EPA obligations"],
      });
      const result = renderAnswerContent(content, "icp_definition");
      expect(result.type).toBe("icp");
      if (result.type === "icp") {
        expect(result.data.org_types).toHaveLength(2);
        expect(result.data.pain_points).toHaveLength(2);
        expect(result.data.decision_makers).toHaveLength(2);
      }
    });
  });

  describe("edge cases", () => {
    it("handles empty content", () => {
      const result = renderAnswerContent("", "tell_me_about_yourself");
      expect(result.type).toBe("markdown");
      if (result.type === "markdown") {
        expect(result.text).toBe("");
      }
    });

    it("handles non-JSON answer types as markdown", () => {
      const result = renderAnswerContent("Some plain text answer", "behavioral_star");
      expect(result.type).toBe("markdown");
    });

    it("handles unknown answer type as markdown", () => {
      const result = renderAnswerContent("content", "unknown_type");
      expect(result.type).toBe("markdown");
    });
  });
});
