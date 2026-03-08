/**
 * Resume parser — uses Claude's native PDF support for PDFs,
 * mammoth for DOCX, plain text for TXT.
 * No pdf-parse dependency needed.
 */

import { anthropic, HAIKU } from "@/lib/ai";
import type { ParsedResume } from "@/types";

const RESUME_PARSING_PROMPT = `Parse this resume into structured JSON. Be precise — do not invent or hallucinate any data. Return ONLY valid JSON, no markdown.

Schema:
{
  "personalInfo": { "name": string|null, "email": string|null, "linkedin": string|null },
  "roles": [
    {
      "company": string,
      "title": string,
      "startDate": string,
      "endDate": string,
      "durationMonths": number,
      "bullets": [
        {
          "originalText": string,
          "category": "metric"|"responsibility"|"tool"|"soft_skill"|"leadership",
          "salesRelevanceScore": number (0-10, where 10 = directly shows sales/biz dev/customer-facing competency),
          "quantified": boolean,
          "extractedMetrics": string[] (pull out any numbers, percentages, dollar amounts)
        }
      ]
    }
  ],
  "skills": [
    { "name": string, "category": "tool"|"methodology"|"soft_skill"|"certification", "salesRelevance": number (0-10) }
  ],
  "education": [
    { "institution": string, "degree": string, "year": string|null }
  ],
  "backgroundType": "career_switcher"|"experienced_sales"|"new_grad"|"other",
  "narrativeSummary": string (2-3 sentences describing who this candidate is and what makes them compelling for a tech sales role),
  "suggestedRoleType": "sdr_bdr"|"account_executive"|"account_manager_csm"|"other_sales"
}

backgroundType guide:
- career_switcher: 0 years in sales/biz dev/SDR/BDR/AE; worked in retail, hospitality, teaching, military, customer service, recruiting, etc.
- experienced_sales: Has held SDR/BDR/AE/Account Manager/sales role before
- new_grad: Recent grad with ≤1 year experience, mostly academic
- other: Doesn't fit above categories clearly

suggestedRoleType guide:
- account_executive: Has held AE, Enterprise AE, Account Executive, Strategic Account Executive, or any quota-carrying closing role with deal ownership
- sdr_bdr: Has held SDR, BDR, Sales Development, Business Development Rep, or outbound prospecting roles; OR career switcher targeting SDR/BDR
- account_manager_csm: Has held Account Manager, Customer Success Manager, CSM, or post-sale relationship roles
- other_sales: Doesn't clearly fit above — sales manager, director, VP, partnerships, enablement, or unclear`;

export async function parseResumeFromFile(
  fileBuffer: Buffer,
  mimeType: string,
  fileName: string
): Promise<ParsedResume> {
  // Debug logging
  console.log("[Resume Parser] File:", fileName);
  console.log("[Resume Parser] MIME:", mimeType);
  console.log("[Resume Parser] Size:", fileBuffer.length, "bytes");
  console.log("[Resume Parser] Magic bytes:", fileBuffer.slice(0, 4).toString("hex"));

  if (fileBuffer.length === 0) {
    throw new Error("Uploaded file appears to be empty");
  }

  // Resolve MIME type from extension if browser reported octet-stream or empty
  let resolvedMime = mimeType;
  if (!resolvedMime || resolvedMime === "application/octet-stream") {
    const ext = fileName.split(".").pop()?.toLowerCase();
    if (ext === "pdf") resolvedMime = "application/pdf";
    else if (ext === "docx") resolvedMime = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    else if (ext === "doc") resolvedMime = "application/msword";
    else if (ext === "txt") resolvedMime = "text/plain";
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let messages: any[];

  if (resolvedMime === "application/pdf") {
    // Claude native PDF support — no pdf-parse needed
    const base64Data = fileBuffer.toString("base64");
    messages = [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: base64Data,
            },
          },
          {
            type: "text",
            text: RESUME_PARSING_PROMPT,
          },
        ],
      },
    ];
  } else if (
    resolvedMime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    resolvedMime === "application/msword" ||
    fileName.endsWith(".docx") ||
    fileName.endsWith(".doc")
  ) {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer: fileBuffer });
    const extractedText = result.value;

    console.log("[Resume Parser] DOCX extracted chars:", extractedText.length);

    if (!extractedText || extractedText.trim().length < 30) {
      throw new Error("Could not extract text from DOCX file — it may be image-based");
    }

    messages = [
      {
        role: "user",
        content: `${RESUME_PARSING_PROMPT}\n\nRESUME TEXT:\n${extractedText.slice(0, 8000)}`,
      },
    ];
  } else if (resolvedMime === "text/plain" || fileName.endsWith(".txt")) {
    const text = fileBuffer.toString("utf-8");

    console.log("[Resume Parser] TXT chars:", text.length);

    if (!text || text.trim().length < 30) {
      throw new Error("Text file appears empty or too short");
    }

    messages = [
      {
        role: "user",
        content: `${RESUME_PARSING_PROMPT}\n\nRESUME TEXT:\n${text.slice(0, 8000)}`,
      },
    ];
  } else {
    throw new Error(
      `Unsupported file type: ${resolvedMime || "unknown"}. Upload a PDF, DOCX, or TXT file.`
    );
  }

  let response;
  try {
    response = await anthropic.messages.create({
      model: HAIKU,
      max_tokens: 4096,
      messages,
    });
  } catch (apiErr) {
    // Log the full error server-side but never propagate SDK internals
    console.error("[Resume Parser] Anthropic API error:", apiErr);
    throw new Error("Resume parsing service is temporarily unavailable. Please try again.");
  }

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Resume parsing service returned an unexpected response. Please try again.");
  }

  // Strip markdown fences if present
  const jsonText = textBlock.text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  // Extract first JSON object in case there's surrounding text
  const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error("[Resume Parser] Could not extract JSON. Raw response:", textBlock.text.slice(0, 500));
    throw new Error("Could not parse your resume. Please try a different format.");
  }

  let parsed: Omit<ParsedResume, "rawText">;
  try {
    parsed = JSON.parse(jsonMatch[0]) as Omit<ParsedResume, "rawText">;
  } catch {
    console.error("[Resume Parser] JSON parse failed. Extracted:", jsonMatch[0].slice(0, 500));
    throw new Error("Could not parse your resume. Please try a different format.");
  }

  return {
    rawText: "", // not needed — Claude read the file directly
    personalInfo: parsed.personalInfo ?? {},
    roles: parsed.roles ?? [],
    skills: parsed.skills ?? [],
    education: parsed.education ?? [],
    backgroundType: parsed.backgroundType ?? "other",
    narrativeSummary: parsed.narrativeSummary ?? "",
    suggestedRoleType: parsed.suggestedRoleType,
  };
}
