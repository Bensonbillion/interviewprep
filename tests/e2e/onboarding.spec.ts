import { test, expect } from "@playwright/test";

test.describe("Onboarding Flow", () => {
  // ── Get-started page ────────────────────────────────────────────────

  test("get-started page loads with role selection", async ({ page }) => {
    await page.goto("/get-started");
    await expect(
      page.getByText(/What role are you interviewing for/i)
    ).toBeVisible();
  });

  test("shows all 4 role options", async ({ page }) => {
    await page.goto("/get-started");
    await expect(page.getByText("SDR / BDR")).toBeVisible();
    await expect(page.getByText("Account Executive")).toBeVisible();
    await expect(page.getByText("AM / CSM")).toBeVisible();
    await expect(page.getByText("Other Sales")).toBeVisible();
  });

  test("shows free credit messaging", async ({ page }) => {
    await page.goto("/get-started");
    await expect(
      page.getByText(/first 3 prep kits are free/i)
    ).toBeVisible();
  });

  test("shows wizard step header with Role as step 1", async ({ page }) => {
    await page.goto("/get-started");
    await expect(page.getByText("Role")).toBeVisible();
    await expect(page.getByText("Resume")).toBeVisible();
    await expect(page.getByText("Company")).toBeVisible();
  });

  test("role cards are clickable", async ({ page }) => {
    await page.goto("/get-started");
    const sdrCard = page.getByText("SDR / BDR");
    await expect(sdrCard).toBeVisible();
    await sdrCard.click();
    // After clicking, the card should have a selected state (visual change)
    // and auth options should appear
  });

  test("shows Google OAuth button for auth", async ({ page }) => {
    await page.goto("/get-started");
    await expect(
      page.getByRole("button", { name: /Continue with Google/i })
    ).toBeVisible();
  });

  test("shows email login option", async ({ page }) => {
    await page.goto("/get-started");
    await expect(page.getByPlaceholder("you@example.com")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Send login link/i })
    ).toBeVisible();
  });

  // ── Onboarding wizard (requires auth) ─────────────────────────────

  test("onboarding page loads step 0 (resume upload)", async ({ page }) => {
    // Onboarding page is at /onboarding — it's the full wizard
    // This will be accessible if the user navigates here directly
    await page.goto("/onboarding");
    await expect(page.getByText(/Upload your resume/i)).toBeVisible();
    await expect(page.getByText(/Step 1 of 3/i)).toBeVisible();
  });

  test("resume upload zone shows drag-and-drop instructions", async ({
    page,
  }) => {
    await page.goto("/onboarding");
    await expect(
      page.getByText(/Drop your resume here or click to upload/i)
    ).toBeVisible();
    await expect(page.getByText(/PDF · DOCX · TXT/i)).toBeVisible();
  });

  test("continue button is disabled without resume", async ({ page }) => {
    await page.goto("/onboarding");
    const continueBtn = page.getByRole("button", { name: /Continue/i });
    await expect(continueBtn).toBeDisabled();
  });

  test("file input accepts correct file types", async ({ page }) => {
    await page.goto("/onboarding");
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toHaveAttribute("accept", ".pdf,.docx,.txt");
  });

  // ── Role type options ─────────────────────────────────────────────

  test("role type options match expected list", async ({ page }) => {
    await page.goto("/get-started");
    const roleTexts = ["SDR / BDR", "Account Executive", "AM / CSM", "Other Sales"];
    for (const text of roleTexts) {
      await expect(page.getByText(text)).toBeVisible();
    }
  });

  test("role descriptions are shown", async ({ page }) => {
    await page.goto("/get-started");
    await expect(page.getByText("Sales Development Rep")).toBeVisible();
  });
});
