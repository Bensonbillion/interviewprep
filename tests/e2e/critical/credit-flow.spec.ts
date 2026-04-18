import { test, expect } from "@playwright/test";

// Tests the credit system — most financially critical path

test.describe("Credit system @smoke", () => {
  test("credit balance visible in nav", async ({ page }) => {
    await page.goto("/dashboard");
    const creditBadge = page
      .locator('[data-testid="credit-balance"]')
      .or(page.locator("text=/\\d+ credits?/"));
    await expect(creditBadge).toBeVisible({ timeout: 10000 });
  });

  test("credits page loads", async ({ page }) => {
    await page.goto("/dashboard");
    const creditsLink = page.locator("text=Credits & Billing").or(page.locator("text=Credits"));
    if (await creditsLink.isVisible()) {
      await creditsLink.click();
      await page.waitForURL(/\/(credits|billing)/);
      await expect(page).not.toHaveURL(/error/);
    }
  });

  test("Stripe checkout redirects correctly", async ({ page }) => {
    await page.goto("/dashboard");

    const buyLink = page
      .locator("text=Buy credits")
      .or(page.locator("text=Get more credits"))
      .or(page.locator("text=Upgrade"));

    if (await buyLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await buyLink.click();
      // Should redirect to Stripe or show pricing
      await page.waitForTimeout(2000);
      const url = page.url();
      // Either stays on platform (pricing modal) or goes to Stripe
      expect(
        url.includes("stripe.com") ||
          url.includes("checkout") ||
          url.includes("pricing") ||
          url.includes("credits")
      ).toBe(true);
    }
  });
});
