import { NextRequest, NextResponse } from "next/server";
import { anthropic, SONNET } from "@/lib/ai";
import { verifyApiAuth } from "@/lib/auth/verify";
import { createAdminClient } from "@/lib/supabase/admin";
import { aiLimiter, checkRateLimit } from "@/lib/security/rate-limit";
import { auditLog } from "@/lib/security/audit";
import { z } from "zod";

const ResearchSchema = z.object({
  session_id: z.string().uuid(),
  interviewers: z
    .array(
      z.object({
        name: z.string().min(1).max(200),
        title: z.string().max(200).optional(),
        company: z.string().min(1).max(200),
        linkedin_url: z.string().max(500).optional(),
      })
    )
    .min(1)
    .max(6),
});

/**
 * POST /api/interviewers/research
 * Batch-research interviewers using Claude web search.
 * Stores results in session_interviewers table.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await verifyApiAuth();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { allowed, headers: rlHeaders } = await checkRateLimit(aiLimiter, auth.userId);
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please wait a moment." },
        { status: 429, headers: rlHeaders }
      );
    }

    const body = await req.json();
    const parsed = ResearchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { session_id, interviewers } = parsed.data;
    const db = createAdminClient();

    // Verify session belongs to user
    const { data: sessionRow } = await db
      .from("prep_sessions")
      .select("id")
      .eq("id", session_id)
      .eq("user_id", auth.userId)
      .single();

    if (!sessionRow) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const results = [];

    for (const interviewer of interviewers) {
      try {
        // Research via Claude with web search tool
        const searchResult = await anthropic.messages.create({
          model: SONNET,
          max_tokens: 2000,
          tools: [
            {
              type: "web_search_20250305" as const,
              name: "web_search",
              max_uses: 5,
            },
          ],
          messages: [
            {
              role: "user",
              content: `Research this person thoroughly for a candidate preparing for a job interview with them.

Name: ${interviewer.name}
Title: ${interviewer.title ?? "unknown"}
Company: ${interviewer.company}
${interviewer.linkedin_url ? `LinkedIn: ${interviewer.linkedin_url}` : "Search for their LinkedIn profile."}

Find:
1. Their career background — where they worked before, how long at current company, career trajectory
2. What their current role actually involves day-to-day
3. Any public content — LinkedIn posts, interviews, podcast appearances, articles, talks
4. What they likely care about professionally
5. Any signals about their communication or management style
6. Personal context that's publicly visible (alma mater, location, interests they've shared publicly)

Then synthesize into an interview prep profile as JSON:
{
  "career_summary": "2-3 sentence career arc",
  "current_role_reality": "what they actually do day to day",
  "likely_priorities": ["3-5 things they care about at work"],
  "how_to_talk_to_them": "2-3 sentence coaching note for the candidate",
  "watch_outs": "1-2 things to avoid or be careful about",
  "personal_notes": "publicly visible personal context",
  "recent_activity": "anything recent they've posted or done",
  "great_question_to_ask_them": "one specific question tailored to them",
  "research_sources": ["list of sources used"]
}

Be specific and grounded in what you actually find. Do not fabricate details. If you can't find something, say so honestly.`,
            },
          ],
        });

        // Extract text blocks from the response (web search may add tool_use blocks)
        const text = searchResult.content
          .filter((b) => b.type === "text")
          .map((b) => ("text" in b ? (b as { text: string }).text : ""))
          .join("");

        let profileData: Record<string, unknown> = {};
        try {
          const cleaned = text
            .replace(/^```(?:json)?\s*/gi, "")
            .replace(/\s*```\s*$/gi, "")
            .trim();
          const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            profileData = JSON.parse(jsonMatch[0]);
          } else {
            profileData = { career_summary: text.slice(0, 2000), research_error: "no_json_found" };
          }
        } catch {
          profileData = { career_summary: text.slice(0, 2000), research_error: "json_parse_failed" };
        }

        // Upsert to session_interviewers
        const { data: row, error: dbErr } = await db
          .from("session_interviewers")
          .upsert(
            {
              session_id,
              name: interviewer.name,
              title: interviewer.title ?? null,
              company: interviewer.company,
              linkedin_url: interviewer.linkedin_url ?? null,
              profile_data: profileData,
              researched_at: new Date().toISOString(),
            },
            { onConflict: "session_id,name" }
          )
          .select("*")
          .single();

        if (dbErr) {
          // Fallback: try insert without onConflict (table may not have unique constraint)
          const { data: insertRow } = await db
            .from("session_interviewers")
            .insert({
              session_id,
              name: interviewer.name,
              title: interviewer.title ?? null,
              company: interviewer.company,
              linkedin_url: interviewer.linkedin_url ?? null,
              profile_data: profileData,
              researched_at: new Date().toISOString(),
            })
            .select("*")
            .single();
          results.push(insertRow ?? { name: interviewer.name, profile_data: profileData });
        } else {
          results.push(row);
        }
      } catch (err) {
        console.error(`[interviewers/research] Failed for ${interviewer.name}:`, err instanceof Error ? err.message : err);
        results.push({
          name: interviewer.name,
          profile_data: { career_summary: null, research_error: "research_failed" },
        });
      }
    }

    auditLog({
      eventType: "generation_completed",
      userId: auth.userId,
      resourceType: "interviewer_research",
      resourceId: session_id,
      details: {
        interviewerCount: interviewers.length,
        names: interviewers.map((i) => i.name),
      },
    });

    return NextResponse.json({ interviewers: results });
  } catch (err) {
    console.error("[interviewers/research] Error:", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: "Failed to research interviewers" },
      { status: 500 }
    );
  }
}
