import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ADMIN_EMAILS } from "@/lib/admin-config";

function admin() {
  return createAdminClient();
}

/**
 * POST /api/admin/knowledge/upload
 * Accepts multipart form: file + metadata fields
 * Uploads file to Supabase Storage → creates knowledge_source record → triggers processing
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !ADMIN_EMAILS.includes(user.email ?? "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const title = formData.get("title") as string;
  const category = formData.get("category") as string;
  const description = formData.get("description") as string | null;
  const tagsRaw = formData.get("tags") as string | null;
  const tags = tagsRaw
    ? tagsRaw.split(",").map((t) => t.trim()).filter(Boolean)
    : [];

  if (!file || !title || !category) {
    return NextResponse.json({ error: "file, title, and category are required" }, { status: 400 });
  }

  const db = admin();
  const ext = file.name.split(".").pop() ?? "bin";
  const filePath = `knowledge/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;

  // Upload to Supabase Storage
  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: uploadError } = await db.storage
    .from("knowledge-files")
    .upload(filePath, buffer, { contentType: file.type, upsert: false });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  // Create source record
  const { data: source, error: insertError } = await db
    .from("knowledge_sources")
    .insert({
      title,
      description: description ?? null,
      source_type: "file_upload",
      file_path: filePath,
      category,
      tags,
      status: "processing",
    })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // Kick off processing (async — don't await so response returns quickly)
  const processUrl = new URL("/api/admin/knowledge/process", req.url);
  fetch(processUrl.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: req.headers.get("cookie") ?? "" },
    body: JSON.stringify({ sourceId: (source as { id: string }).id }),
  }).catch(console.error);

  return NextResponse.json({ source, processing: true });
}
