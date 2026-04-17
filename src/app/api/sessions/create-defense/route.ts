import { NextRequest, NextResponse } from "next/server";
import { verifyApiAuth } from "@/lib/auth/verify";
import { createAdminClient } from "@/lib/supabase/admin";
import { auditLog } from "@/lib/security/audit";
import { z } from "zod";

const Schema = z.object({
  parent_session_id: z.string().uuid(),
  stage_name: z.string().min(1).max(200),
  interview_date: z.string().optional(),
  interviewers: z
    .array(
      z.object({
        name: z.string().max(200),
        title: z.string().max(200).optional(),
      })
    )
    .optional(),
});

/**
 * POST /api/sessions/create-defense
 * Creates a presentation_defense session linked to a parent take-home.
 * Carries over company, resume, and role from the parent.
 * Optionally saves interviewers to session_interviewers.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await verifyApiAuth();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const raw = await req.json();
    const parsed = Schema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const body = parsed.data;
    const db = createAdminClient();

    // Fetch parent session to carry over company/resume data
    const { data: parent, error: parentErr } = await db
      .from("prep_sessions")
      .select("id, role_type, take_home_content, session_data, job_description, target_role, relevance_map")
      .eq("id", body.parent_session_id)
      .eq("user_id", auth.userId)
      .single();

    if (parentErr || !parent) {
      return NextResponse.json(
        { error: "Take-home session not found" },
        { status: 404 }
      );
    }

    const parentData = (parent.session_data ?? {}) as Record<string, unknown>;
    const hasContent =
      parent.take_home_content != null ||
      parentData.takeHomeContent != null;

    if (!hasContent) {
      return NextResponse.json(
        { error: "Take-home session has no content yet — finish generating your submission first" },
        { status: 400 }
      );
    }

    const companyName = (parentData.companyName as string) ?? "Unknown";

    // Build session_data for the defense session
    const sessionId = crypto.randomUUID();
    const validInterviewers = (body.interviewers ?? []).filter((iv) => iv.name.trim());

    const sessionData = {
      id: sessionId,
      companyName,
      companyUrl: (parentData.companyUrl as string) ?? "",
      targetRole: (parentData.targetRole as string) ?? parent.target_role ?? "",
      roleType: (parentData.roleType as string) ?? parent.role_type ?? "sdr_bdr",
      stage: "panel",
      stageType: "presentation_defense",
      stageName: body.stage_name,
      stageOrder: 3,
      parentSessionId: body.parent_session_id,
      interviewDate: body.interview_date ?? null,
      createdAt: Date.now(),
      jobDescription: (parentData.jobDescription as string) ?? parent.job_description ?? "",
      resume: parentData.resume ?? {},
      company: parentData.company ?? {},
      relevanceMap: parentData.relevanceMap ?? parent.relevance_map ?? { strongMatches: [], gaps: [], leadStories: [] },
      personalContext: (parentData.personalContext as string) ?? "",
      answerSlots: [
        { type: "weakness_audit", label: "Weakness audit", description: "The 3 spots in your submission most likely to be challenged", status: "locked" },
        { type: "defense_questions", label: "Hard questions + model answers", description: "What they will ask about YOUR specific submission, with strong answers", status: "locked" },
        { type: "presentation_structure", label: "How to present it", description: "Slide-by-slide timing, what to emphasize, what to skim", status: "locked" },
        { type: "role_play_script", label: "Discovery roleplay", description: "The live discovery call they run at the end of the panel", status: "locked" },
        { type: "cheat_sheet", label: "Stage cheat sheet", description: "How to defend work confidently without being defensive", status: "locked" },
      ],
      interviewers: validInterviewers.map((iv) => ({
        name: iv.name.trim(),
        roleTitle: iv.title?.trim() ?? "",
        linkedinUrl: "",
      })),
    };

    // Insert session
    const { error: insertErr } = await db.from("prep_sessions").insert({
      id: sessionId,
      user_id: auth.userId,
      session_data: sessionData,
      job_description: sessionData.jobDescription,
      target_role: sessionData.targetRole,
      role_type: sessionData.roleType,
      stage: "panel",
      stage_type: "presentation_defense",
      stage_name: body.stage_name,
      stage_order: 3,
      parent_session_id: body.parent_session_id,
      relevance_map: sessionData.relevanceMap,
    });

    if (insertErr) {
      console.error("[create-defense] Insert error:", insertErr.message);
      return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
    }

    // Save interviewers if provided
    if (validInterviewers.length > 0) {
      const ivRows = validInterviewers.map((iv) => ({
        session_id: sessionId,
        name: iv.name.trim(),
        title: iv.title?.trim() ?? null,
        company: companyName,
      }));

      const { error: ivErr } = await db.from("session_interviewers").insert(ivRows);
      if (ivErr) {
        console.error("[create-defense] Interviewer insert error:", ivErr.message);
        // Non-fatal — session was created
      }
    }

    auditLog({
      eventType: "generation_requested",
      userId: auth.userId,
      resourceType: "defense_session",
      resourceId: sessionId,
      details: {
        company: companyName,
        parentSessionId: body.parent_session_id,
        stageName: body.stage_name,
        interviewerCount: validInterviewers.length,
      },
    });

    return NextResponse.json({
      session_id: sessionId,
      parent_session_id: body.parent_session_id,
      has_interviewers: validInterviewers.length > 0,
    });
  } catch (err) {
    console.error("[create-defense] Error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Failed to create defense session" }, { status: 500 });
  }
}
