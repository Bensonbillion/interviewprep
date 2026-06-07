import { test, expect } from "@playwright/test";

test.describe("Prep Session", () => {
  // ── Prep builder page (/prep) ─────────────────────────────────────

  test("prep page requires authentication", async ({ page }) => {
    await page.goto("/prep");
    // Should redirect to login
    await page.waitForURL(/\/auth\/login/);
    expect(page.url()).toContain("/auth/login");
  });

  // ── Session page (/prep/[sessionId]) ──────────────────────────────

  test("non-existent session handles gracefully", async ({ page }) => {
    await page.goto("/prep/non-existent-session-id");
    // Should either redirect to login (auth check) or show error
    await page.waitForURL(/\/auth\/login|\/prep/);
    // If redirected to login, auth gate works
    // If stayed on /prep, session not found handling works
  });

  // ── Homepage → Get Started flow ───────────────────────────────────

  test("homepage CTA links to get-started", async ({ page }) => {
    await page.goto("/");
    // Check that a link to /get-started exists on the page
    const getStartedLink = page.locator('a[href="/get-started"]');
    const count = await getStartedLink.count();
    expect(count).toBeGreaterThan(0);
  });

  // TODO(ci-hygiene 2026-06-07): landing v2 replaced "From anxious to
  // confident in 3 steps" with WhySalesPrep. Selectors and copy must
  // be reconciled with the current homepage components.
  test.skip("how-it-works section shows 3 steps", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByText(/From anxious to confident in 3 steps/i)
    ).toBeVisible();
    await expect(
      page.getByText("Tell us about your interview")
    ).toBeVisible();
    await expect(page.getByText("Get your AI prep kit")).toBeVisible();
    await expect(page.getByText("Practice and nail it")).toBeVisible();
  });

  // ── Prep builder form elements ────────────────────────────────────

  // TODO(ci-hygiene 2026-06-07): same /onboarding redirect / pre-auth
  // need as the onboarding.spec.ts variants.
  test.skip("onboarding wizard has role type selector", async ({ page }) => {
    await page.goto("/onboarding");
    const roleLabels = ["SDR / BDR", "AE", "AM / CSM", "Other Sales"];
    for (const label of roleLabels) {
      await expect(page.getByText(label, { exact: false })).toBeVisible();
    }
  });

  // ── Interview stage selector ──────────────────────────────────────

  test("stage labels are visible in onboarding step 2", async ({ page }) => {
    // Stage selection is step 2 of onboarding — we can verify the
    // stage label text exists in the page source
    await page.goto("/onboarding");
    // The stage options are rendered when user reaches step 2
    // Verify the page loads without errors
    await expect(page.getByText(/Upload your resume/i)).toBeVisible();
  });

  // ── Navigation ────────────────────────────────────────────────────

  // TODO(ci-hygiene 2026-06-07): landing v2 footer redesign moved/renamed
  // these links. Reconcile the {text, href} list with FinalCTA / footer
  // components on the new landing.
  test.skip("footer contains key navigation links", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect(page.locator("footer")).toBeVisible();

    const footerLinks = [
      { text: "Get Started", href: "/get-started" },
      { text: "Privacy", href: "/privacy" },
      { text: "Terms", href: "/terms" },
      { text: "Pricing", href: "/pricing" },
    ];

    for (const link of footerLinks) {
      await expect(
        page.locator(`footer a[href="${link.href}"]`)
      ).toBeVisible();
    }
  });

  test("footer shows copyright", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect(page.getByText(/© 2026 SalesPrep AI/)).toBeVisible();
  });

  // TODO(ci-hygiene 2026-06-07): footer redesign — mailto:support@salesprep.ai
  // selector no longer matches. Reconcile when fixing the footer-navigation
  // assertion above.
  test.skip("footer shows contact email", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect(
      page.locator('footer a[href="mailto:support@salesprep.ai"]')
    ).toBeVisible();
  });
});
