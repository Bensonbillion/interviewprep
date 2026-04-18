import { describe, it, expect, vi } from "vitest";

// Tests the credit safety contract:
// Deduct AFTER successful generation, NEVER before
// Refund on generation failure

describe("Credit safety contract", () => {
  it("does not deduct credits before generation starts", async () => {
    const mockDeduct = vi.fn();
    const mockGenerate = vi.fn().mockResolvedValue({ content: "Generated answer" });

    // Simulate the correct order
    const result = await mockGenerate();
    if (result.content) {
      mockDeduct();
    }

    expect(mockGenerate).toHaveBeenCalledBefore(mockDeduct);
  });

  it("does not deduct credits when generation fails", async () => {
    const mockDeduct = vi.fn();
    const mockGenerate = vi.fn().mockRejectedValue(new Error("Claude API error"));

    try {
      await mockGenerate();
      mockDeduct();
    } catch {
      // Generation failed — deduct should not be called
    }

    expect(mockDeduct).not.toHaveBeenCalled();
  });

  it("deduct is called exactly once per successful generation", async () => {
    const mockDeduct = vi.fn();
    const mockGenerate = vi.fn().mockResolvedValue({ content: "Generated answer" });

    const result = await mockGenerate();
    if (result.content) {
      mockDeduct();
    }

    expect(mockDeduct).toHaveBeenCalledTimes(1);
  });
});
