import { test, expect } from "@playwright/test";

// SCENARIO A: Brand new SDR candidate, no experience, applying to Gong
// Tests: signup flow, first kit generation, free credits, answer rendering

test.describe("Scenario A — New SDR candidate applying to Gong @smoke", () => {
  test("complete onboarding flow for new user", async ({ page }) => {
    // Sign up
    await page.goto("/auth/signup");
    await page.fill('[name="email"]', `test-${Date.now()}@example.com`);
    await page.fill('[name="password"]', "TestPassword123!");
    await page.click('[type="submit"]');

    // Should land on dashboard or onboarding
    await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 15000 });
  });

  test("creates prep kit for Gong SDR recruiter screen", async ({ page }) => {
    await page.goto("/prep/new");

    // Should see stage type selector
    await expect(page.locator("text=What round are you prepping for")).toBeVisible({ timeout: 10000 });

    // Select conversational stage (recruiter screen)
    await page.click("text=Recruiter");

    // Fill in company
    await page.fill('[placeholder*="company"]', "Gong");

    // Submit
    await page.click("text=Generate my prep kit");

    // Should show generating state
    await expect(page.locator("text=Building your prep kit")).toBeVisible({ timeout: 5000 });

    // Wait for kit to complete (max 90s for AI generation)
    await page.waitForURL(/\/prep\/[a-z0-9-]+$/, { timeout: 90000 });
  });

  test("answer cards render content not raw JSON", async ({ page }) => {
    // Navigate to an existing Gong prep session
    await page.goto("/dashboard");

    // Find Gong prep
    const gongPrep = page.locator("text=Gong").first();
    await expect(gongPrep).toBeVisible({ timeout: 10000 });
    await gongPrep.click();

    // Navigate into a session
    await page.click("text=Recruiter Screen");

    // Wait for prep page
    await page.waitForURL(/\/prep\//);

    // The first card should be visible and NOT show raw JSON
    const firstCard = page.locator('[data-testid="answer-card"]').first();
    await expect(firstCard).toBeVisible({ timeout: 15000 });

    const cardContent = await firstCard.textContent();

    // Should NOT contain JSON artifacts
    expect(cardContent).not.toContain('{"answer_type"');
    expect(cardContent).not.toContain('"model_answer":');
    expect(cardContent).not.toContain("```"); // no code fences

    // Should contain readable content
    expect(cardContent!.length).toBeGreaterThan(50);
  });

  test("free first answer unlocks without spending credits", async ({ page }) => {
    await page.goto("/dashboard");

    // Get initial credit balance
    const creditBadge = page.locator('[data-testid="credit-balance"]');
    const initialCredits = await creditBadge.textContent();

    // Navigate to prep
    await page.click("text=Gong");
    await page.click("text=Recruiter Screen");

    // The first card should be unlocked (free)
    const firstCard = page.locator('[data-testid="answer-card"]').first();
    await expect(firstCard.locator('[data-testid="answer-content"]')).toBeVisible({ timeout: 15000 });

    // Credits should not have changed
    await page.goto("/dashboard");
    const finalCredits = await creditBadge.textContent();
    expect(finalCredits).toBe(initialCredits);
  });

  test("locked card shows human-readable preview not UUID", async ({ page }) => {
    await page.goto("/dashboard");
    await page.click("text=Gong");
    await page.click("text=Recruiter Screen");

    // Find a locked card
    const lockedCard = page.locator('[data-testid="locked-card"]').first();

    if (await lockedCard.isVisible()) {
      const previewText = await lockedCard.textContent();
      // Should NOT show UUIDs or JSON
      expect(previewText).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}/);
      expect(previewText).not.toContain("{");
      // Should show descriptive text
      expect(previewText!.length).toBeGreaterThan(20);
    }
  });
});
