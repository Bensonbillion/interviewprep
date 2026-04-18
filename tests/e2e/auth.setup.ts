import { test as setup, expect } from "@playwright/test";
import path from "path";

const authFile = path.join(__dirname, "../.auth/user.json");

setup("authenticate", async ({ page }) => {
  await page.goto("/auth/login");

  // Use test credentials from env
  await page.fill('[name="email"]', process.env.TEST_USER_EMAIL ?? "test@salesprep.ai");
  await page.fill('[name="password"]', process.env.TEST_USER_PASSWORD ?? "testpassword123");
  await page.click('[type="submit"]');

  // Wait for redirect to dashboard
  await page.waitForURL("**/dashboard", { timeout: 15000 });
  await expect(page.locator("text=Dashboard")).toBeVisible();

  await page.context().storageState({ path: authFile });
});
