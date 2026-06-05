/**
 * Render the Insight Interview page for the test sessions created by
 * verify-insight-flows.ts and screenshot it at desktop + 390px mobile.
 *
 * Requires `next dev` running on http://localhost:3000.
 *
 * Outputs:
 *   test-results/screenshots/flow-a-switcher-desktop.png
 *   test-results/screenshots/flow-a-switcher-390px.png
 *   test-results/screenshots/flow-b-fallback-desktop.png
 *   test-results/screenshots/flow-b-fallback-390px.png
 *
 * Auth pattern mirrors tests/e2e/auth.setup.ts — magic link via service
 * role + inject session into localStorage.
 */

import { readFileSync, mkdirSync } from "fs";
import { resolve } from "path";

const envPath = resolve(process.cwd(), ".env.local");
const envContent = readFileSync(envPath, "utf-8");
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eq = trimmed.indexOf("=");
  if (eq === -1) continue;
  const key = trimmed.slice(0, eq);
  const value = trimmed.slice(eq + 1).replace(/^["']|["']$/g, "");
  if (!process.env[key]) process.env[key] = value;
}

async function main() {
  const { chromium } = await import("@playwright/test");
  const { createClient } = await import("@supabase/supabase-js");

  const manifest = JSON.parse(
    readFileSync("test-results/insight-flows-manifest.json", "utf-8")
  ) as {
    test_user_email: string;
    ui_session_id: string;
    flows: { label: string; sessionId: string; interrogation_source: string }[];
  };
  const uiSessionId = manifest.ui_session_id;
  const fallbackSession = manifest.flows.find((f) => f.interrogation_source === "fallback");
  if (!fallbackSession) throw new Error("No fallback session in manifest.");
  const fallbackSessionId = fallbackSession.sessionId;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SECRET_KEY!;
  const testEmail = manifest.test_user_email;

  // Sign in via password (TEST_USER_PASSWORD lives in .env.local). We
  // get a session from supabase-js, then plant the @supabase/ssr cookie
  // directly in Playwright's browser context. The auth/callback route
  // expects a PKCE `code`, but a service-role-issued session is
  // recognized by createBrowserClient from the cookie alone.
  const testPassword = process.env.TEST_USER_PASSWORD;
  if (!testPassword) throw new Error("TEST_USER_PASSWORD not set in .env.local");

  // Ensure the test user's password matches what TEST_USER_PASSWORD has
  // — the env var pairing exists for exactly this kind of automation.
  const admin = createClient(supabaseUrl, serviceKey);
  const { data: usersList } = await admin.auth.admin.listUsers();
  const testUser = usersList?.users.find((u) => u.email === testEmail);
  if (!testUser) throw new Error(`Test user ${testEmail} not found`);
  const { error: updErr } = await admin.auth.admin.updateUserById(testUser.id, {
    password: testPassword,
  });
  if (updErr) throw new Error(`Failed to set test user password: ${updErr.message}`);

  const userClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
  const { data: signInData, error: signInErr } = await userClient.auth.signInWithPassword({
    email: testEmail,
    password: testPassword,
  });
  if (signInErr || !signInData.session) {
    throw new Error(`signInWithPassword failed: ${signInErr?.message}`);
  }
  const session = signInData.session;
  console.log(`Got session for ${session.user.email}`);

  // @supabase/ssr cookie format: name is sb-<ref>-auth-token, value is a
  // URL-encoded JSON of the session shape. Browser client reads this on
  // first navigation to bootstrap. For sessions large enough to exceed
  // ~3.6KB the value is "base64-" prefixed and chunked across .0/.1 etc;
  // password-only sessions stay well under that limit.
  const projectRef = supabaseUrl.match(/https:\/\/([^.]+)/)?.[1] ?? "";
  const cookieName = `sb-${projectRef}-auth-token`;
  const cookieValue = encodeURIComponent(
    JSON.stringify({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_at: session.expires_at,
      expires_in: session.expires_in,
      token_type: "bearer",
      user: session.user,
    })
  );

  mkdirSync("test-results/screenshots", { recursive: true });

  const browser = await chromium.launch();

  async function authenticate(ctx: import("@playwright/test").BrowserContext) {
    await ctx.addCookies([
      {
        name: cookieName,
        value: cookieValue,
        url: "http://localhost:3000",
        httpOnly: false,
        secure: false,
        sameSite: "Lax",
      },
    ]);
  }

  async function capture(label: string, sessionId: string, width: number, height: number, file: string) {
    const ctx = await browser.newContext({ viewport: { width, height } });
    await authenticate(ctx);
    const page = await ctx.newPage();
    await page.goto(`http://localhost:3000/get-started/insight?session=${sessionId}`);
    try {
      await page.waitForSelector("textarea", { timeout: 30000 });
    } catch {
      console.warn(`  ${label}: textarea didn't render in 30s — screenshotting current state`);
    }
    await page.waitForTimeout(1200);
    await page.screenshot({ path: file, fullPage: true });
    console.log(`  ${label}: ${file}`);
    await ctx.close();
  }

  console.log("━━━ Flow (a) switcher UI render ━━━");
  await capture("desktop 1280x900", uiSessionId, 1280, 900, "test-results/screenshots/flow-a-switcher-desktop.png");
  await capture("mobile 390x844 (iPhone 14)", uiSessionId, 390, 844, "test-results/screenshots/flow-a-switcher-390px.png");

  console.log("━━━ Flow (b) fallback UI render ━━━");
  await capture("desktop 1280x900", fallbackSessionId, 1280, 900, "test-results/screenshots/flow-b-fallback-desktop.png");
  await capture("mobile 390x844", fallbackSessionId, 390, 844, "test-results/screenshots/flow-b-fallback-390px.png");

  await browser.close();
  console.log("\nDone. Screenshots in test-results/screenshots/");
}

main().catch((err) => {
  console.error("Screenshot run failed:", err);
  process.exit(1);
});
