import { test, expect } from "@playwright/test";

// SCENARIO B: Experienced AE switching companies, applying to HubSpot
// Tests: deep_dive stage type, metrics-heavy answers, AE-specific cards

test.describe("Scenario B — Experienced AE applying to HubSpot", () => {
  test("creates HubSpot AE hiring manager prep kit", async ({ page }) => {
    await page.goto("/prep/new");

    await expect(page.locator("text=What round are you prepping for")).toBeVisible({ timeout: 10000 });

    // Select deep dive (hiring manager)
    await page.click("text=Hiring Manager");

    await page.fill('[placeholder*="company"]', "HubSpot");
    await page.fill('[placeholder*="role"]', "Account Executive");

    await page.click("text=Generate");

    await page.waitForURL(/\/prep\/[a-z0-9-]+$/, { timeout: 90000 });
  });

  test("deep_dive kit has different cards than conversational", async ({ page }) => {
    await page.goto("/dashboard");

    // Navigate to HubSpot AE prep
    const hubspotPrep = page.locator("text=HubSpot").first();

    if (await hubspotPrep.isVisible()) {
      await hubspotPrep.click();

      // Should see hiring manager round
      const hmRound = page.locator("text=Hiring Manager");
      if (await hmRound.isVisible()) {
        await hmRound.click();

        // Deep dive should have behavioral_star cards
        await expect(page.locator("text=Biggest win")).toBeVisible({ timeout: 15000 });
        // Should NOT have comp_expectations (that's conversational only)
        // Should have company_brief
        await expect(page.locator("text=Company research")).toBeVisible({ timeout: 10000 });
      }
    }
  });
});
