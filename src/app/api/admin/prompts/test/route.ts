import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ADMIN_EMAILS } from "@/lib/admin-config";
import { anthropic, SONNET } from "@/lib/ai";
import type { AnswerType, PrepSession } from "@/types";
import { buildPromptForAnswerType } from "@/lib/ai/prompts";
import { detectRoleSeniority } from "@/lib/ai/seniority";
import { parseJobListing } from "@/lib/ai/job-listing";

async function requireAdmin(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !ADMIN_EMAILS.includes(user.email ?? "")) return null;
  return user;
}

/**
 * POST /api/admin/prompts/test
 * Run a custom system prompt against a sample session + answer type.
 * Returns the generated output for side-by-side comparison.
 */
export async function POST(req: NextRequest) {
  const user = await requireAdmin(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const body = await req.json() as {
    promptText: string;          // The system prompt to test
    answerType: AnswerType;
    session: PrepSession;        // Sample session data
  };

  const { promptText, answerType, session } = body;
  if (!promptText || !answerType || !session) {
    return NextResponse.json({ error: "promptText, answerType, session required" }, { status: 400 });
  }

  try {
    // Build the user prompt using existing prompt builders
    const { user: userPrompt, maxTokens } = buildPromptForAnswerType(answerType, {
      resume: session.resume,
      company: session.company,
      relevanceMap: session.relevanceMap,
      jobDescription: session.jobDescription,
      targetRole: session.targetRole,
      roleType: session.roleType,
      stage: session.stage,
      seniority: detectRoleSeniority(session.targetRole, session.jobDescription),
      jobListingSignals: session.jobDescription ? parseJobListing(session.jobDescription) : undefined,
    });

    const response = await anthropic.messages.create({
      model: SONNET,
      max_tokens: maxTokens,
      system: promptText,
      messages: [{ role: "user", content: userPrompt }],
    });

    const content = response.content[0];
    if (content.type !== "text") throw new Error("Unexpected response type");

    const rawContent = content.text
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    return NextResponse.json({ content: rawContent });
  } catch (err) {
    console.error("Prompt test error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Test failed" },
      { status: 500 }
    );
  }
}
