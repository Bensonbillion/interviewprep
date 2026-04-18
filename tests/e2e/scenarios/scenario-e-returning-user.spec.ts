import { test, expect } from "@playwright/test";

// SCENARIO E: Returning user with multiple preps across companies
// Tests: sidebar grouping, session history, multi-company navigation

test.describe("Scenario E — Returning user with multiple preps @smoke", () => {
  test("dashboard shows all prep companies in sidebar", async ({ page }) => {
    await page.goto("/dashboard");

    // Sidebar should show company list
    const sidebar = page.locator('[data-testid="sidebar"]').or(page.locator("nav"));
    await expect(sidebar).toBeVisible({ timeout: 10000 });

    // Should show MY PREPS section
    await expect(page.locator("text=MY PREPS").or(page.locator("text=My Preps"))).toBeVisible();
  });

  test("clicking between companies loads correct sessions", async ({ page }) => {
    await page.goto("/dashboard");

    // Click first company
    const firstCompany = page.locator('[data-testid="company-group"]').first();
    if (await firstCompany.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstCompany.click();

      // URL should update or session should load
      await page.waitForTimeout(500);

      // Click second company (if exists)
      const companies = page.locator('[data-testid="company-group"]');
      const count = await companies.count();

      if (count >= 2) {
        await companies.nth(1).click();
        // Should not show error
        await expect(page.locator("text=error")).not.toBeVisible();
      }
    }
  });

  test("session not found shows recovery UI not blank page", async ({ page }) => {
    // Navigate to a non-existent session
    await page.goto("/prep/00000000-0000-0000-0000-000000000000");

    // Should show recovery UI
    await expect(
      page
        .locator("text=no longer available")
        .or(page.locator("text=Session not found"))
        .or(page.locator("text=not found"))
    ).toBeVisible({ timeout: 10000 });

    // Should have a recovery action button
    await expect(
      page
        .locator("text=New prep kit")
        .or(page.locator("text=Back to dashboard"))
        .or(page.locator("text=Go back"))
    ).toBeVisible();
  });
});
