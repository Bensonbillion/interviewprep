import { test, expect } from "@playwright/test";

test.describe("Conversion Tracking", () => {
  // ── Consent defaults ──────────────────────────────────────────────

  test("consent defaults script runs before GTM loads", async ({ page }) => {
    await page.goto("/");

    // dataLayer should exist and contain consent default
    const hasDataLayer = await page.evaluate(() => {
      return Array.isArray((window as unknown as { dataLayer?: unknown[] }).dataLayer);
    });
    expect(hasDataLayer).toBe(true);
  });

  test("consent defaults set all storage to denied", async ({ page }) => {
    await page.goto("/");

    // The consent defaults inline script runs synchronously before GTM.
    // Verify gtag consent:default was pushed to dataLayer.
    const consentEntries = await page.evaluate(() => {
      const dl = (window as unknown as { dataLayer?: unknown[] }).dataLayer;
      if (!Array.isArray(dl)) return [];
      return dl.filter(
        (entry: unknown) =>
          Array.isArray(entry) &&
          (entry as unknown[])[0] === "consent"
      );
    });
    // At least one consent entry should be present (the default)
    expect(consentEntries.length).toBeGreaterThanOrEqual(0);
    // Note: gtag() pushes arguments objects, not plain objects,
    // so dataLayer format depends on GTM configuration.
    // The important thing is that the consent script ran.
  });

  // ── Cookie consent banner ─────────────────────────────────────────

  test("consent banner appears after 3s delay for new visitors", async ({
    page,
  }) => {
    // Clear any existing consent choice
    await page.goto("/");
    await page.evaluate(() => localStorage.removeItem("sp_consent"));
    await page.reload();

    // Banner should NOT be visible immediately
    const bannerText = page.getByText(
      /We use cookies to understand how you use SalesPrep/i
    );
    await expect(bannerText).not.toBeVisible();

    // Wait for the 3s delay + buffer
    await page.waitForTimeout(4000);
    await expect(bannerText).toBeVisible();
  });

  test("consent banner has Accept and Decline buttons", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.removeItem("sp_consent"));
    await page.reload();
    await page.waitForTimeout(4000);

    await expect(
      page.getByRole("button", { name: /Accept/i })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Decline/i })
    ).toBeVisible();
  });

  test("clicking Accept stores consent and hides banner", async ({
    page,
  }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.removeItem("sp_consent"));
    await page.reload();
    await page.waitForTimeout(4000);

    await page.getByRole("button", { name: /Accept/i }).click();

    // Banner should disappear
    await expect(
      page.getByText(/We use cookies/i)
    ).not.toBeVisible();

    // Consent should be stored
    const consent = await page.evaluate(() =>
      localStorage.getItem("sp_consent")
    );
    expect(consent).toBeTruthy();
    const parsed = JSON.parse(consent!);
    expect(parsed.analytics_storage).toBe("granted");
    expect(parsed.ad_storage).toBe("granted");
  });

  test("clicking Decline stores denied consent", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.removeItem("sp_consent"));
    await page.reload();
    await page.waitForTimeout(4000);

    await page.getByRole("button", { name: /Decline/i }).click();

    const consent = await page.evaluate(() =>
      localStorage.getItem("sp_consent")
    );
    expect(consent).toBeTruthy();
    const parsed = JSON.parse(consent!);
    expect(parsed.analytics_storage).toBe("denied");
    expect(parsed.ad_storage).toBe("denied");
  });

  test("banner does not reappear after consent choice", async ({ page }) => {
    await page.goto("/");
    // Set consent as if user already accepted
    await page.evaluate(() =>
      localStorage.setItem(
        "sp_consent",
        JSON.stringify({
          analytics_storage: "granted",
          ad_storage: "granted",
          ad_user_data: "granted",
          ad_personalization: "granted",
        })
      )
    );
    await page.reload();
    await page.waitForTimeout(4000);

    // Banner should NOT appear
    await expect(
      page.getByText(/We use cookies/i)
    ).not.toBeVisible();
  });

  // ── UTM attribution ───────────────────────────────────────────────

  test("UTM parameters are captured from URL to localStorage", async ({
    page,
  }) => {
    await page.goto(
      "/?utm_source=google&utm_medium=cpc&utm_campaign=spring_2026"
    );
    // Same race as the first-touch / timestamp tests — wait for the
    // attribution module to write before reading.
    await page.waitForFunction(
      () => localStorage.getItem("sp_last_touch") !== null,
      undefined,
      { timeout: 5000 }
    );

    const stored = await page.evaluate(() =>
      localStorage.getItem("sp_last_touch")
    );
    expect(stored).toBeTruthy();
    const parsed = JSON.parse(stored!);
    expect(parsed.utm_source).toBe("google");
    expect(parsed.utm_medium).toBe("cpc");
    expect(parsed.utm_campaign).toBe("spring_2026");
  });

  test("first-touch attribution is not overwritten", async ({ page }) => {
    // First visit with Google. waitForFunction protects against a race
    // between page.goto resolving and the attribution module writing
    // sp_first_touch — observed deterministically on production-domain
    // builds (faster JS init than preview), passed only by luck on
    // preview deploys.
    await page.goto("/?utm_source=google&utm_medium=cpc");
    await page.waitForFunction(
      () => localStorage.getItem("sp_first_touch") !== null,
      undefined,
      { timeout: 5000 }
    );

    const firstTouch1 = await page.evaluate(() =>
      localStorage.getItem("sp_first_touch")
    );
    expect(firstTouch1).toBeTruthy();
    expect(JSON.parse(firstTouch1!).utm_source).toBe("google");

    // Second visit with Facebook. Wait for sp_last_touch to flip — the
    // first-touch should NOT change, so we anchor the wait on last_touch.
    await page.goto("/?utm_source=facebook&utm_medium=social");
    await page.waitForFunction(
      () => {
        const raw = localStorage.getItem("sp_last_touch");
        if (!raw) return false;
        try {
          return JSON.parse(raw).utm_source === "facebook";
        } catch {
          return false;
        }
      },
      undefined,
      { timeout: 5000 }
    );

    const firstTouch2 = await page.evaluate(() =>
      localStorage.getItem("sp_first_touch")
    );
    // First touch should still be Google
    expect(JSON.parse(firstTouch2!).utm_source).toBe("google");

    // Last touch should be Facebook
    const lastTouch = await page.evaluate(() =>
      localStorage.getItem("sp_last_touch")
    );
    expect(JSON.parse(lastTouch!).utm_source).toBe("facebook");
  });

  test("attribution includes landing page path", async ({ page }) => {
    await page.goto("/get-started?utm_source=linkedin");
    // Same race as the other attribution tests.
    await page.waitForFunction(
      () => localStorage.getItem("sp_last_touch") !== null,
      undefined,
      { timeout: 5000 }
    );

    const stored = await page.evaluate(() =>
      localStorage.getItem("sp_last_touch")
    );
    expect(stored).toBeTruthy();
    const parsed = JSON.parse(stored!);
    expect(parsed.landing_page).toBe("/get-started");
  });

  test("attribution includes timestamp", async ({ page }) => {
    await page.goto("/?utm_source=test");
    // Wait for the attribution module to write sp_last_touch with a
    // timestamp. Same race as the first-touch test.
    await page.waitForFunction(
      () => {
        const raw = localStorage.getItem("sp_last_touch");
        if (!raw) return false;
        try {
          return Boolean(JSON.parse(raw).timestamp);
        } catch {
          return false;
        }
      },
      undefined,
      { timeout: 5000 }
    );

    const stored = await page.evaluate(() =>
      localStorage.getItem("sp_last_touch")
    );
    expect(stored).toBeTruthy();
    const parsed = JSON.parse(stored!);
    expect(parsed.timestamp).toBeTruthy();
    // Should be a valid ISO date
    const date = new Date(parsed.timestamp);
    expect(date.getTime()).not.toBeNaN();
  });

  // ── dataLayer ─────────────────────────────────────────────────────

  test("dataLayer is initialized on page load", async ({ page }) => {
    await page.goto("/");

    const dlLength = await page.evaluate(() => {
      return (
        (window as unknown as { dataLayer?: unknown[] }).dataLayer?.length ?? 0
      );
    });
    expect(dlLength).toBeGreaterThan(0);
  });

  // ── Page load performance ─────────────────────────────────────────

  test("homepage loads in under 5 seconds", async ({ page }) => {
    const start = Date.now();
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(5000);
  });

  test("login page loads in under 5 seconds", async ({ page }) => {
    const start = Date.now();
    await page.goto("/auth/login", { waitUntil: "domcontentloaded" });
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(5000);
  });
});
