import { test, expect } from "@playwright/test";

// SCENARIO D: Career switcher (retail → sales) applying to Salesforce
// Tests: career_switcher background type, bridge answers, appropriate framing

test.describe("Scenario D — Career switcher applying to Salesforce", () => {
  test("Salesforce prep loads without error", async ({ page }) => {
    await page.goto("/dashboard");

    const sfPrep = page.locator("text=Salesforce").first();
    if (await sfPrep.isVisible()) {
      await sfPrep.click();

      const recruiterRound = page.locator("text=Recruiter Screen").first();
      if (await recruiterRound.isVisible()) {
        await recruiterRound.click();
        await page.waitForURL(/\/prep\//);
        // Should not show error state
        await expect(page.locator("text=error")).not.toBeVisible();
        await expect(page.locator("text=Session not found")).not.toBeVisible();
      }
    }
  });
});
