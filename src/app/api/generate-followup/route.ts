import { NextRequest, NextResponse } from "next/server";
import { anthropic, SONNET } from "@/lib/ai";
import { verifyApiAuth } from "@/lib/auth/verify";
import { generateFollowupSchema } from "@/lib/validation/schemas";
import type { PrepSession, InterviewerDossier } from "@/types";

interface FollowUpEmailResult {
  subject: string;
  body: string;
  interviewerName?: string;
}

function buildFollowUpPrompt(
  session: PrepSession,
  notes: string,
  interviewer?: InterviewerDossier
): { system: string; user: string } {
  const interviewerCtx = interviewer
    ? `\nInterviewer: ${interviewer.name}${interviewer.roleTitle ? ` (${interviewer.roleTitle})` : ""}
Background: ${interviewer.background}`
    : "";

  return {
    system: `You are an expert career coach specializing in tech sales. You write authentic, concise post-interview follow-up emails that stand out — not generic "thanks for your time" emails. Your emails are specific, warm, and subtly reinforce why the candidate is the right hire. Always write in first person as if you ARE the candidate.`,
    user: `Write a post-interview follow-up email for the following candidate.

CANDIDATE: ${session.resume.personalInfo.name ?? "the candidate"}
ROLE: ${session.targetRole} at ${session.companyName}
STAGE: ${session.stage}
${interviewerCtx}
COMPANY CONTEXT: ${session.company.productDescription}

CANDIDATE NOTES (optional — what happened in the interview, highlights, anything to reference):
${notes || "No specific notes provided — write a strong general follow-up."}

EMAIL REQUIREMENTS:
- Subject: Specific and memorable — mention the role, company, and something personal from the interview if notes are provided. NOT "Following up on our interview."
- Opening line: Reference something specific from the conversation — a topic discussed, a question they asked, or a point that resonated. If no notes, open with genuine enthusiasm for the role.
- Body (2–3 short paragraphs):
  1. Reinforce ONE key reason they are the right fit — tied to the company's specific challenge or the role's requirements
  2. Address or build on a moment from the interview (from notes) — or, if no notes, mention what excites them most about the company
  3. Clear, warm close — reaffirm interest, offer to send anything else, say you're looking forward to next steps
- Tone: Professional but human — like a great rep who also happens to be a great communicator. Warm, confident, not desperate.
- Length: 120–180 words (body only, not counting subject)
- NO clichés: "circling back", "hope this finds you well", "I wanted to reach out", "as per our conversation"

Return JSON:
{
  "subject": "...",
  "body": "..."
}

Return ONLY the JSON. No markdown, no explanation.`,
  };
}

export async function POST(req: NextRequest) {
  const auth = await verifyApiAuth();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = generateFollowupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const session = parsed.data.session as unknown as PrepSession;
    const notes: string = parsed.data.notes ?? "";
    const interviewerIndex: number | undefined = parsed.data.interviewerIndex;

    if (!session) {
      return NextResponse.json({ error: "Session data required" }, { status: 400 });
    }

    const dossiers = session.interviewerDossiers ?? [];
    const generateMultiple = dossiers.length > 1 && interviewerIndex === undefined;

    if (generateMultiple) {
      // Panel mode — one email per interviewer
      const results: FollowUpEmailResult[] = await Promise.all(
        dossiers.map(async (dossier) => {
          const { system, user } = buildFollowUpPrompt(session, notes, dossier);
          const response = await anthropic.messages.create({
            model: SONNET,
            max_tokens: 600,
            system,
            messages: [{ role: "user", content: user }],
          });
          const content = response.content[0];
          if (content.type !== "text") throw new Error("Unexpected response type");
          const raw = content.text
            .replace(/^```(?:json)?\s*/i, "")
            .replace(/\s*```$/i, "")
            .trim();
          const parsed = JSON.parse(raw) as { subject: string; body: string };
          return { ...parsed, interviewerName: dossier.name };
        })
      );
      return NextResponse.json({ emails: results });
    }

    // Single email — optionally for a specific interviewer
    const dossier =
      interviewerIndex !== undefined ? dossiers[interviewerIndex] : dossiers[0];
    const { system, user } = buildFollowUpPrompt(session, notes, dossier);

    const response = await anthropic.messages.create({
      model: SONNET,
      max_tokens: 600,
      system,
      messages: [{ role: "user", content: user }],
    });

    const content = response.content[0];
    if (content.type !== "text") throw new Error("Unexpected response type");
    const raw = content.text
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    const emailResult = JSON.parse(raw) as { subject: string; body: string };

    return NextResponse.json({
      emails: [{ ...emailResult, interviewerName: dossier?.name }],
    });
  } catch (err) {
    console.error("Generate follow-up error:", err);
    return NextResponse.json(
      { error: "Failed to generate follow-up email. Please try again." },
      { status: 500 }
    );
  }
}
