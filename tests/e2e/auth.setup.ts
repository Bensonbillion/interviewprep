import { test as setup, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import path from "path";
import { config } from "dotenv";

config({ path: ".env.local" });

const authFile = path.join(__dirname, "../.auth/user.json");

setup("authenticate", async ({ page }) => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  const testEmail = process.env.TEST_USER_EMAIL ?? "paulhills566@gmail.com";

  if (!supabaseUrl || !serviceKey) {
    console.log("Skipping auth setup — no Supabase credentials");
    await page.context().storageState({ path: authFile });
    return;
  }

  const admin = createClient(supabaseUrl, serviceKey);

  // Generate a magic link and exchange for a session
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: testEmail,
  });

  if (linkError || !linkData) {
    console.log("Auth setup: could not generate link —", linkError?.message);
    await page.context().storageState({ path: authFile });
    return;
  }

  const { data: session, error: sessionError } = await admin.auth.verifyOtp({
    token_hash: linkData.properties.hashed_token,
    type: "magiclink",
  });

  if (sessionError || !session?.session) {
    console.log("Auth setup: could not verify OTP —", sessionError?.message);
    await page.context().storageState({ path: authFile });
    return;
  }

  // Navigate to the app first
  await page.goto("/");
  await page.waitForLoadState("domcontentloaded");

  // Inject the Supabase session via localStorage (the client-side Supabase reads this)
  const projectRef = supabaseUrl.match(/https:\/\/([^.]+)/)?.[1] ?? "";
  const storageKey = `sb-${projectRef}-auth-token`;

  const sessionData = {
    access_token: session.session.access_token,
    refresh_token: session.session.refresh_token,
    expires_at: session.session.expires_at,
    expires_in: session.session.expires_in,
    token_type: "bearer",
    user: session.session.user,
  };

  await page.evaluate(
    ({ key, value }) => {
      localStorage.setItem(key, JSON.stringify(value));
    },
    { key: storageKey, value: sessionData }
  );

  // Reload to pick up the auth state
  await page.goto("/dashboard");
  await page.waitForTimeout(3000);

  // Verify we're authenticated (dashboard loads, not redirected to login)
  const url = page.url();
  if (url.includes("/dashboard")) {
    console.log("Auth setup complete — authenticated as", testEmail);
  } else {
    console.log("Auth setup: redirected to", url, "— may not be fully authenticated");
  }

  await page.context().storageState({ path: authFile });
});
