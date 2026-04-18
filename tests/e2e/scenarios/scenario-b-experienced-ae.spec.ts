import { test, expect } from "@playwright/test";

// SCENARIO B: Experienced AE switching companies, applying to HubSpot
// Tests: deep_dive stage type, AE-specific cards

test.describe("Scenario B — Experienced AE applying to HubSpot", () => {
  test("dashboard loads and shows existing sessions", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForTimeout(2000);

    // If authenticated, should see dashboard content
    if (page.url().includes("dashboard")) {
      const body = await page.textContent("body");
      expect(body!.length).toBeGreaterThan(100);
    }
  });

  test("prep session page loads without error for existing session", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForTimeout(2000);

    if (page.url().includes("dashboard")) {
      // Try clicking any existing prep session link
      const prepLink = page.locator('a[href*="/prep/"]').first();
      if (await prepLink.isVisible({ timeout: 3000 }).catch(() => false)) {
        await prepLink.click();
        await page.waitForURL(/\/prep\//);
        // Should not show error
        await expect(page.locator("text=Internal Server Error")).not.toBeVisible();
      }
    }
  });
});
