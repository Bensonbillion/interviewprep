import { describe, it, expect } from "vitest";

describe("Test infrastructure smoke test", () => {
  it("vitest runs and assertions work", () => {
    expect(1 + 1).toBe(2);
  });

  it("environment variables are set from setup.ts", () => {
    expect(process.env.NEXT_PUBLIC_SUPABASE_URL).toBe(
      "http://localhost:54321"
    );
    expect(process.env.ANTHROPIC_API_KEY).toBe("sk-ant-test-key");
    expect(process.env.DATA_ENCRYPTION_KEY).toBeDefined();
  });

  it("path aliases resolve (@/ prefix)", async () => {
    // This verifies the vitest alias config works
    const mod = await import("@/lib/security/encryption");
    expect(mod.encrypt).toBeDefined();
    expect(mod.decrypt).toBeDefined();
  });
});
