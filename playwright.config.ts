import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [
    ["html"],
    ["line"],
    ["json", { outputFile: "test-results/results.json" }],
  ],
  use: {
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "on-first-failure",
    video: "on-first-retry",
    // Vercel Preview Protection bypass — every request out of every
    // project (setup + chromium + mobile) carries the header, so a
    // protected preview is reachable without the SSO redirect. The
    // secret is set in Vercel project settings (Deployment Protection
    // → Protection Bypass for Automation) and mirrored to GitHub
    // Actions as VERCEL_AUTOMATION_BYPASS_SECRET. Local runs against
    // http://localhost:3000 simply omit the env var and send no header.
    extraHTTPHeaders: process.env.VERCEL_AUTOMATION_BYPASS_SECRET
      ? { "x-vercel-protection-bypass": process.env.VERCEL_AUTOMATION_BYPASS_SECRET }
      : {},
  },
  projects: [
    // Auth setup — runs first
    {
      name: "setup",
      testMatch: "**/auth.setup.ts",
    },
    // Main test suite
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "tests/.auth/user.json",
      },
      dependencies: ["setup"],
    },
    // Mobile — smoke tests only
    {
      name: "mobile-chrome",
      use: {
        ...devices["Pixel 7"],
        storageState: "tests/.auth/user.json",
      },
      dependencies: ["setup"],
      grep: /@smoke/,
    },
  ],
  webServer: process.env.CI
    ? undefined
    : {
        command: "npm run dev",
        url: "http://localhost:3000",
        reuseExistingServer: !process.env.CI,
        timeout: 120000,
      },
});
