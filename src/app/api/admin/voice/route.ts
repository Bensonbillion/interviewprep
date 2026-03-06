import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ADMIN_EMAILS } from "@/lib/admin-config";

function admin() {
  return createAdminClient();
}

async function requireAdmin(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !ADMIN_EMAILS.includes(user.email ?? "")) return null;
  return user;
}

// GET: fetch active voice profile + all its rules
export async function GET(req: NextRequest) {
  const user = await requireAdmin(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const db = admin();
  const { data: voice } = await db
    .from("voice_profile")
    .select("*")
    .eq("is_active", true)
    .order("created_at")
    .limit(1)
    .single();

  if (!voice) return NextResponse.json({ voice: null, rules: [] });

  const voiceData = voice as { id: string };
  const { data: rules } = await db
    .from("style_rules")
    .select("*")
    .eq("voice_id", voiceData.id)
    .order("rule_type")
    .order("created_at");

  return NextResponse.json({ voice, rules: rules ?? [] });
}

// PATCH: update voice profile description / tone_keywords
export async function PATCH(req: NextRequest) {
  const user = await requireAdmin(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const body = await req.json() as { id: string; description?: string; tone_keywords?: string[] };
  const { id, ...updates } = body;

  const db = admin();
  const { data, error } = await db
    .from("voice_profile")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ voice: data });
}

// POST to /api/admin/voice/rules — add a style rule
export async function POST(req: NextRequest) {
  const user = await requireAdmin(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const body = await req.json() as {
    voice_id: string;
    rule_type: string;
    rule_text: string;
    replacement?: string;
    severity?: string;
  };

  const db = admin();
  const { data, error } = await db
    .from("style_rules")
    .insert(body)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ rule: data });
}

// DELETE a style rule
export async function DELETE(req: NextRequest) {
  const user = await requireAdmin(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const { id } = await req.json() as { id: string };
  const db = admin();
  const { error } = await db.from("style_rules").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
