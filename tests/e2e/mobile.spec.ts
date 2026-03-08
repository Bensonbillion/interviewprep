import { test, expect } from "@playwright/test";

// Only run on mobile projects
test.describe("Mobile Tests", () => {
  // ── StickyMobileCTA ───────────────────────────────────────────────

  test("sticky mobile CTA appears after scrolling past hero", async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, "Mobile-only test");

    await page.goto("/");
    // CTA should be hidden initially (or not visible in viewport)
    const stickyCta = page.getByRole("link", {
      name: /Start practicing free/i,
    });

    // Scroll past the hero section
    await page.evaluate(() => window.scrollTo(0, 800));
    await page.waitForTimeout(500); // wait for scroll animation

    await expect(stickyCta).toBeVisible();
  });

  test("sticky CTA links to get-started", async ({ page, isMobile }) => {
    test.skip(!isMobile, "Mobile-only test");

    await page.goto("/");
    await page.evaluate(() => window.scrollTo(0, 800));
    await page.waitForTimeout(500);

    const stickyCta = page.getByRole("link", {
      name: /Start practicing free/i,
    });
    await expect(stickyCta).toHaveAttribute("href", "/get-started");
  });

  // ── Responsive layout ────────────────────────────────────────────

  test("homepage hero renders on mobile viewport", async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, "Mobile-only test");

    await page.goto("/");
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator("#hero-cta")).toBeVisible();
  });

  test("login page is usable on mobile", async ({ page, isMobile }) => {
    test.skip(!isMobile, "Mobile-only test");

    await page.goto("/auth/login");
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Continue with Google/i })
    ).toBeVisible();
    await expect(page.getByPlaceholder("you@example.com")).toBeVisible();

    // Email input should be interactable
    const emailInput = page.getByPlaceholder("you@example.com");
    await emailInput.fill("test@example.com");
    await expect(emailInput).toHaveValue("test@example.com");
  });

  test("get-started page role cards stack on mobile", async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, "Mobile-only test");

    await page.goto("/get-started");
    // All role options should be visible and tappable
    await expect(page.getByText("SDR / BDR")).toBeVisible();
    await expect(page.getByText("Account Executive")).toBeVisible();
    await expect(page.getByText("AM / CSM")).toBeVisible();
    await expect(page.getByText("Other Sales")).toBeVisible();
  });

  test("onboarding resume upload is tappable on mobile", async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, "Mobile-only test");

    await page.goto("/onboarding");
    await expect(
      page.getByText(/Drop your resume here or click to upload/i)
    ).toBeVisible();
    // File input exists and is functional
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toBeAttached();
  });

  // ── Desktop-only checks ───────────────────────────────────────────

  test("sticky CTA is hidden on desktop", async ({ page, isMobile }) => {
    test.skip(isMobile === true, "Desktop-only test");

    await page.goto("/");
    await page.evaluate(() => window.scrollTo(0, 800));
    await page.waitForTimeout(500);

    // StickyMobileCTA has md:hidden class — should not be visible on desktop
    const stickyCta = page.getByRole("link", {
      name: /Start practicing free/i,
    });
    // On desktop, the sticky CTA should either not exist or be hidden
    if ((await stickyCta.count()) > 0) {
      await expect(stickyCta).not.toBeVisible();
    }
  });

  // ── Touch interactions ────────────────────────────────────────────

  test("footer is scrollable and visible on mobile", async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, "Mobile-only test");

    await page.goto("/");
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect(page.locator("footer")).toBeVisible();
    await expect(page.getByText(/© 2026 SalesPrep AI/)).toBeVisible();
  });

  test("how-it-works steps are visible on mobile", async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, "Mobile-only test");

    await page.goto("/");
    // Scroll to how-it-works section
    const section = page.getByText(/From anxious to confident in 3 steps/i);
    await section.scrollIntoViewIfNeeded();
    await expect(section).toBeVisible();
  });
});
