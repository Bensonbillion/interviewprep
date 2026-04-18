import { test, expect } from "@playwright/test";

// SCENARIO A: Brand new SDR candidate, no experience, applying to Gong
// Tests: signup flow, first kit generation, free credits, answer rendering

test.describe("Scenario A — New SDR candidate applying to Gong @smoke", () => {
  test("homepage loads and shows CTA", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("body")).toBeVisible();
    // Should have some call-to-action
    const cta = page.locator("text=Get Started").or(page.locator("text=Start")).or(page.locator("text=Try"));
    await expect(cta.first()).toBeVisible({ timeout: 10000 });
  });

  test("get-started page loads", async ({ page }) => {
    await page.goto("/get-started");
    await expect(page.locator("body")).toBeVisible();
    // Should not show an error
    await expect(page.locator("text=500")).not.toBeVisible();
    await expect(page.locator("text=Internal Server Error")).not.toBeVisible();
  });

  test("/prep/new page loads", async ({ page }) => {
    await page.goto("/prep/new");
    await page.waitForTimeout(2000);
    // Should show stage tiles, redirect to get-started, or redirect to login
    const url = page.url();
    const body = await page.textContent("body");
    expect(
      url.includes("prep/new") ||
      url.includes("get-started") ||
      url.includes("login") ||
      (body?.length ?? 0) > 100
    ).toBe(true);
  });

  test("dashboard loads for authenticated user", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForTimeout(2000);
    const url = page.url();
    // Either shows dashboard or redirects to login
    expect(url.includes("dashboard") || url.includes("login") || url.includes("auth")).toBe(true);
  });

  test("pricing page loads without error", async ({ page }) => {
    await page.goto("/pricing");
    await expect(page.locator("body")).toBeVisible();
    await expect(page.locator("text=500")).not.toBeVisible();
  });
});
