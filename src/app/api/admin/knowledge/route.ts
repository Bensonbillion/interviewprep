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
  if (!user || !ADMIN_EMAILS.includes(user.email ?? "")) {
    return null;
  }
  return user;
}

// GET: list all knowledge sources
export async function GET(req: NextRequest) {
  const user = await requireAdmin(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const db = admin();
  const { data, error } = await db
    .from("knowledge_sources")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ sources: data ?? [] });
}

// POST: create a new knowledge source record + trigger processing
export async function POST(req: NextRequest) {
  const user = await requireAdmin(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const body = await req.json() as {
    title: string;
    description?: string;
    source_type: "file_upload" | "url" | "text_paste";
    original_url?: string;
    raw_content?: string;
    file_path?: string;
    category: string;
    tags?: string[];
  };

  const db = admin();
  const { data, error } = await db
    .from("knowledge_sources")
    .insert({
      title: body.title,
      description: body.description ?? null,
      source_type: body.source_type,
      original_url: body.original_url ?? null,
      raw_content: body.raw_content ?? null,
      file_path: body.file_path ?? null,
      category: body.category,
      tags: body.tags ?? [],
      status: "processing",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ source: data });
}

// DELETE: remove a knowledge source (cascades to chunks)
export async function DELETE(req: NextRequest) {
  const user = await requireAdmin(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const { id } = await req.json() as { id: string };

  const db = admin();
  const { error } = await db.from("knowledge_sources").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
