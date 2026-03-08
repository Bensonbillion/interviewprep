import { NextRequest, NextResponse } from "next/server";
import { verifyApiAuth } from "@/lib/auth/verify";
import { parseResumeFromFile } from "@/lib/resume/parser";

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyApiAuth();
    if (!auth) {
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
    const rawMsg = err instanceof Error ? err.message : String(err);
    const rawStack = err instanceof Error ? err.stack : undefined;
    console.error("[parse-resume] ERROR:", rawMsg);
    if (rawStack) console.error("[parse-resume] STACK:", rawStack);
    // Never expose raw error messages — they may contain API keys or internal details
    // Temporarily include a safe diagnostic hint (no secrets) for debugging
    const safeMessage =
      err instanceof Error && /empty|unsupported|too short|image-based|DOCX/i.test(err.message)
        ? err.message
        : "Failed to parse resume. Please try a different file format or paste your resume as text.";
    // Include a non-sensitive error class hint for debugging
    const errorHint = err instanceof Error ? err.constructor.name : "unknown";
    return NextResponse.json({ error: safeMessage, _debug: errorHint }, { status: 500 });
  }
}
