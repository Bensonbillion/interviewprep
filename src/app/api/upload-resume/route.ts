import { NextRequest, NextResponse } from "next/server";
import { verifyApiAuth } from "@/lib/auth/verify";
import { parseResumeFromFile } from "@/lib/resume/parser";

const ALLOWED_TYPES: Record<string, readonly number[]> = {
  "application/pdf": [0x25, 0x50, 0x44, 0x46], // %PDF
  "application/msword": [0xd0, 0xcf, 0x11, 0xe0], // DOC
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [0x50, 0x4b, 0x03, 0x04], // DOCX (ZIP)
  "text/plain": [], // No magic bytes check for plain text
};

const ALLOWED_EXTENSIONS = [".pdf", ".doc", ".docx", ".txt"];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(req: NextRequest) {
  const auth = await verifyApiAuth();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Size check
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File too large. Maximum 10MB." }, { status: 400 });
    }

    if (file.size === 0) {
      return NextResponse.json({ error: "File is empty." }, { status: 400 });
    }

    // Extension check
    const name = file.name.toLowerCase();
    const ext = name.substring(name.lastIndexOf("."));
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json(
        { error: `Unsupported file type. Allowed: ${ALLOWED_EXTENSIONS.join(", ")}` },
        { status: 400 },
      );
    }

    // MIME type check
    if (!Object.keys(ALLOWED_TYPES).includes(file.type)) {
      return NextResponse.json(
        { error: "Unsupported file type." },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Magic bytes check
    const expectedBytes = ALLOWED_TYPES[file.type];
    if (expectedBytes && expectedBytes.length > 0) {
      const header = Array.from(buffer.subarray(0, expectedBytes.length));
      const matches = expectedBytes.every((b, i) => header[i] === b);
      if (!matches) {
        return NextResponse.json(
          { error: "File content does not match its declared type." },
          { status: 400 },
        );
      }
    }

    const resume = await parseResumeFromFile(buffer, file.type, file.name);

    return NextResponse.json({ resume });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("Resume upload error:", msg);
    return NextResponse.json(
      { error: "Failed to parse resume. Please try a different file format." },
      { status: 500 },
    );
  }
}
