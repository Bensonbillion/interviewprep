import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseResumeFromFile } from "@/lib/resume/parser";

export async function POST(req: NextRequest) {
  try {
    // Auth check
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file");

    console.log("[parse-resume] file type:", typeof file, "| constructor:", file?.constructor?.name);

    // Use duck-typing instead of instanceof — safer across Next.js module contexts
    if (!file || typeof (file as File).arrayBuffer !== "function") {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const f = file as File;
    console.log("[parse-resume] name:", f.name, "| mime:", f.type, "| size:", f.size);

    if (f.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large. Maximum 5MB." }, { status: 400 });
    }

    if (f.size === 0) {
      return NextResponse.json({ error: "File is empty." }, { status: 400 });
    }

    const buffer = Buffer.from(await f.arrayBuffer());
    console.log("[parse-resume] buffer length:", buffer.length, "| magic:", buffer.slice(0, 4).toString("hex"));

    const resume = await parseResumeFromFile(buffer, f.type, f.name);
    return NextResponse.json({ resume });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[parse-resume] ERROR:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
