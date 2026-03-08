import { NextResponse } from "next/server";

export async function GET() {
  const checks: Record<string, string> = {};

  // Check env vars are present (not their values)
  checks.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
    ? `set (${process.env.ANTHROPIC_API_KEY.length} chars, starts: ${process.env.ANTHROPIC_API_KEY.slice(0, 10)}...)`
    : "MISSING";
  checks.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ? "set" : "MISSING";
  checks.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "MISSING";
  checks.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ? `set (${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length} chars)`
    : "MISSING";
  checks.DATA_ENCRYPTION_KEY = process.env.DATA_ENCRYPTION_KEY ? "set" : "MISSING";

  // Quick Anthropic API test
  try {
    const { anthropic, HAIKU } = await import("@/lib/ai");
    const res = await anthropic.messages.create({
      model: HAIKU,
      max_tokens: 10,
      messages: [{ role: "user", content: "Say OK" }],
    });
    const text = res.content.find((b) => b.type === "text");
    checks.anthropic_api = `OK (response: ${text?.type === "text" ? text.text : "no text"})`;
  } catch (err) {
    checks.anthropic_api = `FAILED: ${err instanceof Error ? err.constructor.name + ": " + err.message.slice(0, 100) : String(err).slice(0, 100)}`;
  }

  return NextResponse.json({ status: "ok", checks, timestamp: new Date().toISOString() });
}
