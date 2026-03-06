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

// GET: list all prompt versions
export async function GET(req: NextRequest) {
  const user = await requireAdmin(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const db = admin();
  const { data, error } = await db
    .from("prompt_versions")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ versions: data ?? [] });
}

// POST: create a new prompt version (always as draft)
export async function POST(req: NextRequest) {
  const user = await requireAdmin(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const body = await req.json() as {
    name: string;
    question_key?: string | null;
    prompt_text: string;
  };

  const db = admin();
  const { data, error } = await db
    .from("prompt_versions")
    .insert({
      name: body.name,
      question_key: body.question_key ?? null,
      prompt_text: body.prompt_text,
      is_active: false,
      is_default: false,
      created_by: user.email,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ version: data });
}

// PATCH: promote a version to active (deactivates the previous active one)
export async function PATCH(req: NextRequest) {
  const user = await requireAdmin(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const body = await req.json() as { id: string; action: "promote" | "update"; prompt_text?: string; name?: string };
  const db = admin();

  if (body.action === "promote") {
    // Deactivate current active for same question_key
    const { data: target } = await db
      .from("prompt_versions")
      .select("question_key")
      .eq("id", body.id)
      .single();

    const targetData = target as { question_key: string | null } | null;
    await db
      .from("prompt_versions")
      .update({ is_active: false })
      .eq("question_key", targetData?.question_key ?? "")
      .eq("is_active", true);

    // Activate the new one
    const { data, error } = await db
      .from("prompt_versions")
      .update({ is_active: true })
      .eq("id", body.id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ version: data });
  }

  // Generic update
  const { id, action: _action, ...updates } = body;
  const { data, error } = await db
    .from("prompt_versions")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ version: data });
}

// DELETE: archive a prompt version
export async function DELETE(req: NextRequest) {
  const user = await requireAdmin(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const { id } = await req.json() as { id: string };
  const db = admin();
  const { error } = await db.from("prompt_versions").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
