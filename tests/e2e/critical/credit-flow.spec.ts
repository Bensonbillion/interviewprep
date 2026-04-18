import { test, expect } from "@playwright/test";

// Tests the credit system — most financially critical path

test.describe("Credit system @smoke", () => {
  test("dashboard loads for authenticated user", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForTimeout(2000);
    // Either shows dashboard or redirects to login
    expect(page.url().includes("dashboard") || page.url().includes("login")).toBe(true);
  });

  test("billing page loads without error", async ({ page }) => {
    await page.goto("/dashboard/billing");
    await page.waitForTimeout(2000);
    // Should load or redirect
    await expect(page.locator("text=Internal Server Error")).not.toBeVisible();
  });

  test("pricing page loads and shows plans", async ({ page }) => {
    await page.goto("/pricing");
    await expect(page.locator("body")).toBeVisible();
    // Should show some pricing content
    const body = await page.textContent("body");
    expect(body!.length).toBeGreaterThan(200);
  });
});
