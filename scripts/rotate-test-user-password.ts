/**
 * Rotate TEST_USER_PASSWORD: generate a 32-char URL-safe random value,
 * write it to .env.local, reset the test user's auth credential via the
 * Supabase admin API. One-shot. Does not echo the new value to stdout.
 */

import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";
import { randomBytes } from "crypto";

const envPath = resolve(process.cwd(), ".env.local");
const envText = readFileSync(envPath, "utf-8");

for (const line of envText.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eq = trimmed.indexOf("=");
  if (eq === -1) continue;
  const k = trimmed.slice(0, eq);
  const v = trimmed.slice(eq + 1).replace(/^["']|["']$/g, "");
  if (!process.env[k]) process.env[k] = v;
}

async function main() {
  const { createClient } = await import("@supabase/supabase-js");

  // 32 chars from base64url alphabet (A-Z a-z 0-9 - _). 24 random bytes
  // → 32 base64url chars exactly, no padding needed.
  const newPassword = randomBytes(24).toString("base64url");
  if (newPassword.length !== 32) {
    throw new Error(`Expected 32-char password, got ${newPassword.length}`);
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  );
  const testEmail = process.env.TEST_USER_EMAIL ?? "paulhills566@gmail.com";
  const { data: usersList } = await admin.auth.admin.listUsers();
  const testUser = usersList?.users.find((u) => u.email === testEmail);
  if (!testUser) throw new Error(`Test user ${testEmail} not found`);
  const { error: updErr } = await admin.auth.admin.updateUserById(testUser.id, {
    password: newPassword,
  });
  if (updErr) throw new Error(`Admin password update failed: ${updErr.message}`);

  // Update .env.local in place, preserving comments and order.
  const lines = envText.split("\n");
  let replaced = false;
  const newLines = lines.map((line) => {
    if (line.startsWith("TEST_USER_PASSWORD=")) {
      replaced = true;
      return `TEST_USER_PASSWORD=${newPassword}`;
    }
    return line;
  });
  if (!replaced) {
    newLines.push(`TEST_USER_PASSWORD=${newPassword}`);
  }
  writeFileSync(envPath, newLines.join("\n"));

  console.log(`Rotated TEST_USER_PASSWORD for ${testEmail}.`);
  console.log(`length=${newPassword.length}  charset=base64url  first2=${newPassword.slice(0, 2)}  last2=${newPassword.slice(-2)}`);
}

main().catch((err) => {
  console.error("Rotation failed:", err);
  process.exit(1);
});
