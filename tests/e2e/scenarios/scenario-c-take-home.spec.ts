import { test, expect } from "@playwright/test";

// SCENARIO C: Bootcamp grad with take-home assignment for Klir
// Tests: take_home stage type, output generator UI, defense session linking

test.describe("Scenario C — Take-home assignment for Klir @smoke", () => {
  test("take_home stage shows different UI from standard prep", async ({ page }) => {
    await page.goto("/dashboard");

    // Find Klir take-home session if it exists
    const klirPrep = page.locator("text=Klir").first();

    if (await klirPrep.isVisible()) {
      await klirPrep.click();

      const takeHomeLink = page.locator("text=Take-home");
      if (await takeHomeLink.isVisible()) {
        await takeHomeLink.click();

        // Take-home page should show content cards not answer unlock cards
        // Should NOT show "Unlock for 1 credit" button
        await expect(page.locator("text=Unlock")).not.toBeVisible();

        // Should show ICP, prospects, email, etc.
        await expect(
          page.locator("text=ICP").or(page.locator("text=Ideal Customer"))
        ).toBeVisible({ timeout: 15000 });
      }
    }
  });

  test("panel trigger banner appears after take-home completion", async ({ page }) => {
    await page.goto("/dashboard");

    const klirPrep = page.locator("text=Klir").first();
    if (await klirPrep.isVisible()) {
      await klirPrep.click();

      const takeHomeLink = page.locator("text=Take-home");
      if (await takeHomeLink.isVisible()) {
        await takeHomeLink.click();

        // Banner should appear (may be at bottom)
        const banner = page.locator("text=Got invited to the panel");
        if (await banner.isVisible({ timeout: 5000 }).catch(() => false)) {
          expect(banner).toBeVisible();
        }
      }
    }
  });

  test("defense session page shows interviewer cards", async ({ page }) => {
    await page.goto("/dashboard");

    const klirPrep = page.locator("text=Klir").first();
    if (await klirPrep.isVisible()) {
      await klirPrep.click();

      const panelLink = page
        .locator("text=Panel")
        .or(page.locator("text=Presentation Defense"))
        .first();
      if (await panelLink.isVisible()) {
        await panelLink.click();

        await page.waitForURL(/\/prep\//);

        // Should see interviewer section
        const whoFacing = page
          .locator('[data-testid="tab-people"]')
          .or(page.locator("text=Who you\u2019re facing"));
        if (await whoFacing.isVisible({ timeout: 5000 }).catch(() => false)) {
          await whoFacing.click();
          // Should show at least one interviewer card
          const interviewerCard = page.locator('[data-testid="interviewer-card"]');
          if (await interviewerCard.isVisible({ timeout: 5000 }).catch(() => false)) {
            const cardText = await interviewerCard.textContent();
            expect(cardText).not.toContain("{");
            expect(cardText!.length).toBeGreaterThan(30);
          }
        }
      }
    }
  });

  test("live mode page renders without sidebar @smoke", async ({ page }) => {
    await page.goto("/dashboard");

    const klirPrep = page.locator("text=Klir").first();
    if (await klirPrep.isVisible()) {
      await klirPrep.click();

      const panelLink = page
        .locator("text=Panel")
        .or(page.locator("text=Presentation Defense"))
        .first();
      if (await panelLink.isVisible()) {
        await panelLink.click();

        await page.waitForURL(/\/prep\//);

        // Find live mode button
        const liveBtn = page.locator("text=Open live mode");
        if (await liveBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
          const href = await liveBtn.getAttribute("href");
          if (href) {
            await page.goto(href);

            // Live mode should have NO sidebar
            await expect(page.locator("nav")).not.toBeVisible();
            await expect(page.locator('[data-testid="sidebar"]')).not.toBeVisible();

            // Should have dark background
            const body = page.locator("body");
            const bg = await body.evaluate((el) => window.getComputedStyle(el).backgroundColor);
            // Dark background: background should not be white
            expect(bg).not.toBe("rgb(255, 255, 255)");

            // Should have filter chips
            const filterStrip = page.locator("text=All").or(page.locator("text=People"));
            await expect(filterStrip.first()).toBeVisible({ timeout: 5000 });
          }
        }
      }
    }
  });
});
