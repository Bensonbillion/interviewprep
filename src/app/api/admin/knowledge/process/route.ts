import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ADMIN_EMAILS } from "@/lib/admin-config";
import { generateEmbeddings } from "@/lib/embeddings";
import { chunkText } from "@/lib/text-chunker";
import { extractTextFromBuffer, mimeFromFilename } from "@/lib/file-extractor";
import { FIRECRAWL_API_KEY } from "@/lib/ai";

function admin() {
  return createAdminClient();
}

async function requireAdmin(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !ADMIN_EMAILS.includes(user.email ?? "")) return null;
  return user;
}

export async function POST(req: NextRequest) {
  const user = await requireAdmin(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const { sourceId } = await req.json() as { sourceId: string };
  if (!sourceId) return NextResponse.json({ error: "sourceId required" }, { status: 400 });

  const db = admin();

  // 1. Fetch the source
  const { data: source, error: sourceErr } = await db
    .from("knowledge_sources")
    .select("*")
    .eq("id", sourceId)
    .single();

  if (sourceErr || !source) {
    return NextResponse.json({ error: "Source not found" }, { status: 404 });
  }

  try {
    // 2. Extract raw text based on source_type
    let rawText = (source as { raw_content: string | null }).raw_content ?? "";

    const sourceType = (source as { source_type: string }).source_type;
    const filePath = (source as { file_path: string | null }).file_path;
    const originalUrl = (source as { original_url: string | null }).original_url;

    if (sourceType === "url" && originalUrl) {
      // Scrape URL via Firecrawl (reuse existing pattern)
      if (FIRECRAWL_API_KEY) {
        const fcRes = await fetch("https://api.firecrawl.dev/v1/scrape", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
          },
          body: JSON.stringify({
            url: originalUrl,
            formats: ["markdown"],
          }),
        });
        if (fcRes.ok) {
          const fcData = await fcRes.json();
          rawText = fcData.data?.markdown ?? rawText;
        }
      } else {
        // Plain fetch fallback
        const res = await fetch(originalUrl);
        rawText = await res.text();
      }

      // Save raw content
      await db
        .from("knowledge_sources")
        .update({ raw_content: rawText })
        .eq("id", sourceId);
    }

    if (sourceType === "file_upload" && filePath) {
      // Download from Supabase Storage
      const { data: fileData, error: fileErr } = await db.storage
        .from("knowledge-files")
        .download(filePath);

      if (!fileErr && fileData) {
        const buffer = Buffer.from(await fileData.arrayBuffer());
        const mime = mimeFromFilename(filePath);
        rawText = await extractTextFromBuffer(buffer, mime);

        await db
          .from("knowledge_sources")
          .update({ raw_content: rawText })
          .eq("id", sourceId);
      }
    }

    if (!rawText.trim()) {
      await db
        .from("knowledge_sources")
        .update({ status: "error" })
        .eq("id", sourceId);
      return NextResponse.json({ error: "No text extracted from source" }, { status: 422 });
    }

    // 3. Chunk the text
    const chunks = chunkText(rawText, { chunkSize: 800, chunkOverlap: 100 });
    if (chunks.length === 0) {
      await db.from("knowledge_sources").update({ status: "error" }).eq("id", sourceId);
      return NextResponse.json({ error: "Text produced no chunks" }, { status: 422 });
    }

    // 4. Generate embeddings
    const embeddings = await generateEmbeddings(chunks.map((c) => c.text));

    // 5. Delete existing chunks for this source (re-processing support)
    await db.from("admin_knowledge_chunks").delete().eq("source_id", sourceId);

    // 6. Insert new chunks with embeddings
    const sourceData = source as {
      category: string;
      tags: string[];
      title: string;
    };

    const chunkRows = chunks.map((chunk, i) => ({
      source_id: sourceId,
      content: chunk.text,
      chunk_index: i,
      embedding: embeddings[i] as number[],
      metadata: {
        category: sourceData.category,
        tags: sourceData.tags,
        source_title: sourceData.title,
      },
    }));

    // Insert in batches to avoid payload limits
    const BATCH = 50;
    for (let i = 0; i < chunkRows.length; i += BATCH) {
      await db.from("admin_knowledge_chunks").insert(chunkRows.slice(i, i + BATCH));
    }

    // 7. Mark source as ready
    await db
      .from("knowledge_sources")
      .update({ status: "ready", chunk_count: chunks.length })
      .eq("id", sourceId);

    return NextResponse.json({ success: true, chunkCount: chunks.length });
  } catch (err) {
    console.error("Knowledge processing error:", err);
    await db.from("knowledge_sources").update({ status: "error" }).eq("id", sourceId);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Processing failed" },
      { status: 500 }
    );
  }
}
