import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ADMIN_EMAILS } from "@/lib/admin-config";
import { generateEmbedding } from "@/lib/embeddings";

function admin() {
  return createAdminClient();
}

async function requireAdmin(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !ADMIN_EMAILS.includes(user.email ?? "")) return null;
  return user;
}

// GET: list all golden examples
export async function GET(req: NextRequest) {
  const user = await requireAdmin(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const db = admin();
  const { searchParams } = new URL(req.url);
  const questionKey = searchParams.get("question_key");
  const roleType = searchParams.get("role_type");

  let query = db.from("golden_examples").select("*").order("created_at", { ascending: false });
  if (questionKey) query = query.eq("question_key", questionKey);
  if (roleType) query = query.eq("role_type", roleType);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ examples: data ?? [] });
}

// POST: create a new golden example (auto-embeds)
export async function POST(req: NextRequest) {
  const user = await requireAdmin(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const body = await req.json() as {
    question_key: string;
    role_type?: string | null;
    round_type?: string | null;
    question_text: string;
    answer_text: string;
    framework?: string;
    quality_score: number;
    notes?: string;
    source?: string;
  };

  // Generate embedding for the question+answer text
  const textToEmbed = `${body.question_text}\n\n${body.answer_text}`;
  const embedding = await generateEmbedding(textToEmbed);

  const db = admin();
  const { data, error } = await db
    .from("golden_examples")
    .insert({
      ...body,
      embedding,
      is_active: true,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ example: data });
}

// PATCH: update an example (toggle active, edit)
export async function PATCH(req: NextRequest) {
  const user = await requireAdmin(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const body = await req.json() as { id: string; [key: string]: unknown };
  const { id, ...updates } = body;

  // Re-embed if content changed
  if (updates.question_text || updates.answer_text) {
    const db2 = admin();
    const { data: existing } = await db2
      .from("golden_examples")
      .select("question_text, answer_text")
      .eq("id", id)
      .single();
    const existing2 = existing as { question_text: string; answer_text: string } | null;
    const q = (updates.question_text as string) ?? existing2?.question_text ?? "";
    const a = (updates.answer_text as string) ?? existing2?.answer_text ?? "";
    (updates as Record<string, unknown>).embedding = await generateEmbedding(`${q}\n\n${a}`);
  }

  const db = admin();
  const { data, error } = await db
    .from("golden_examples")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ example: data });
}

// DELETE: remove an example
export async function DELETE(req: NextRequest) {
  const user = await requireAdmin(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const { id } = await req.json() as { id: string };
  const db = admin();
  const { error } = await db.from("golden_examples").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
