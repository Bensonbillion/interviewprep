/**
 * File text extraction utility.
 * Supports PDF (via unpdf), DOCX (via mammoth), TXT, and MD.
 */

/**
 * Extract plain text from a Buffer given its MIME type or file extension.
 */
export async function extractTextFromBuffer(
  buffer: Buffer,
  mimeType: string
): Promise<string> {
  const mime = mimeType.toLowerCase();

  // ── PDF ──────────────────────────────────────────────────────────────────
  if (mime === "application/pdf" || mime.endsWith(".pdf")) {
    const { extractText } = await import("unpdf");
    const uint8 = new Uint8Array(buffer);
    const result = await extractText(uint8, { mergePages: true });
    return result.text ?? "";
  }

  // ── DOCX ─────────────────────────────────────────────────────────────────
  if (
    mime ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mime.endsWith(".docx")
  ) {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return result.value ?? "";
  }

  // ── TXT / MD / plain text ─────────────────────────────────────────────────
  return buffer.toString("utf-8");
}

/**
 * Guess MIME type from filename extension.
 */
export function mimeFromFilename(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    pdf: "application/pdf",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    txt: "text/plain",
    md: "text/markdown",
    markdown: "text/markdown",
  };
  return map[ext] ?? "text/plain";
}
