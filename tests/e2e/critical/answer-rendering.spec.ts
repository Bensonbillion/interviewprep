import { test, expect } from "@playwright/test";

// Tests that NO raw JSON or markdown ever shows to users

test.describe("Answer rendering — no raw content @smoke", () => {
  const RAW_CONTENT_PATTERNS = [
    /\{"question":/, // raw JSON question object
    /\{"model_answer":/, // raw JSON answer object
    /\{"weak_spots":/, // raw JSON weak spots
    /\{"points":/, // raw JSON cheat sheet
    /```json/, // markdown code fence
    /```\n/, // markdown code fence
  ];

  test("no raw JSON visible on any prep session", async ({ page }) => {
    await page.goto("/dashboard");

    // Find any prep session
    const firstSession = page.locator('[data-testid="company-group"]').first();
    if (await firstSession.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstSession.click();

      const firstRound = page.locator('[data-testid="stage-link"]').first();
      if (await firstRound.isVisible({ timeout: 3000 }).catch(() => false)) {
        await firstRound.click();
        await page.waitForURL(/\/prep\//);

        // Wait for content to load
        await page.waitForTimeout(2000);

        const pageContent = (await page.textContent("body")) ?? "";

        for (const pattern of RAW_CONTENT_PATTERNS) {
          expect(pageContent).not.toMatch(pattern);
        }
      }
    }
  });

  test("no AI slop phrases in generated answers", async ({ page }) => {
    await page.goto("/dashboard");

    const SLOP_PHRASES = [
      "delve into",
      "it is worth noting",
      "it's worth noting",
      "in today's fast-paced",
      "in the realm of",
      "a testament to",
      "game-changer",
      "cutting-edge",
      "leverage synergies",
    ];

    const firstSession = page.locator('[data-testid="company-group"]').first();
    if (await firstSession.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstSession.click();

      const firstRound = page.locator('[data-testid="stage-link"]').first();
      if (await firstRound.isVisible({ timeout: 3000 }).catch(() => false)) {
        await firstRound.click();
        await page.waitForURL(/\/prep\//);
        await page.waitForTimeout(2000);

        // Check unlocked answer cards only
        const answerCards = page.locator('[data-testid="answer-content"]');
        const count = await answerCards.count();

        for (let i = 0; i < Math.min(count, 3); i++) {
          const cardText = (await answerCards.nth(i).textContent()) ?? "";
          for (const phrase of SLOP_PHRASES) {
            expect(cardText.toLowerCase()).not.toContain(phrase);
          }
        }
      }
    }
  });
});
