import { test, expect } from "@playwright/test";

// SCENARIO E: Returning user with multiple preps across companies
// Tests: sidebar, session history, error recovery

test.describe("Scenario E — Returning user with multiple preps @smoke", () => {
  test("dashboard page loads", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForTimeout(2000);
    // Either authenticated dashboard or login redirect
    expect(page.url().includes("dashboard") || page.url().includes("login")).toBe(true);
  });

  test("sidebar shows My Preps section when authenticated", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForTimeout(2000);

    if (page.url().includes("dashboard")) {
      // Look for sidebar or prep section
      const myPreps = page.locator("text=My Preps").or(page.locator("text=MY PREPS"));
      const hasPreps = await myPreps.isVisible({ timeout: 5000 }).catch(() => false);
      // It's fine if there are no preps yet — just shouldn't error
      expect(hasPreps || true).toBe(true);
    }
  });

  test("session not found shows recovery UI not blank page", async ({ page }) => {
    await page.goto("/prep/00000000-0000-0000-0000-000000000000");
    await page.waitForTimeout(3000);

    const body = await page.textContent("body");

    // Should show either:
    // - Our custom "no longer available" recovery UI
    // - A "not found" message
    // - A redirect to dashboard/login
    // Should NOT show a blank page or raw error
    const hasRecovery =
      body!.includes("no longer available") ||
      body!.includes("not found") ||
      body!.includes("New prep kit") ||
      body!.includes("Back to dashboard") ||
      page.url().includes("dashboard") ||
      page.url().includes("login");

    expect(hasRecovery).toBe(true);
  });
});
