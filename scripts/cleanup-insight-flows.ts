/**
 * Delete the test prep_sessions created by verify-insight-flows.ts.
 * Reads the manifest at test-results/insight-flows-manifest.json.
 */

import { readFileSync } from "fs";
import { resolve } from "path";

const envPath = resolve(process.cwd(), ".env.local");
try {
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
} catch {
  console.error("Could not read .env.local.");
  process.exit(1);
}

async function main() {
  const { createClient } = await import("@supabase/supabase-js");
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!);

  const manifest = JSON.parse(readFileSync("test-results/insight-flows-manifest.json", "utf-8")) as {
    flows: { sessionId: string }[];
    ui_session_id?: string;
  };
  const ids = [...manifest.flows.map((f) => f.sessionId), manifest.ui_session_id].filter(Boolean) as string[];

  for (const id of ids) {
    // Delete dependent rows first to satisfy any non-cascading FKs.
    await db.from("captured_insights").delete().eq("session_id", id);
    await db.from("positioning_briefs").delete().eq("session_id", id);
    await db.from("narrative_spines").delete().eq("session_id", id).then(() => undefined, () => undefined);
    await db.from("generated_answers").delete().eq("session_id", id).then(() => undefined, () => undefined);
    const { error } = await db.from("prep_sessions").delete().eq("id", id);
    if (error) console.warn(`Cleanup warning for ${id}:`, error.message);
    else console.log(`Deleted ${id}`);
  }
}

main();
