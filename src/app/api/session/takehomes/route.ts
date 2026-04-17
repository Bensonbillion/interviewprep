import { NextResponse } from "next/server";
import { verifyApiAuth } from "@/lib/auth/verify";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/session/takehomes
 * Returns the user's take-home sessions that have content (for parent linking).
 */
export async function GET() {
  try {
    const auth = await verifyApiAuth();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = createAdminClient();

    // Find sessions with stage_type = take_home OR legacy stage = take_home
    // that have take_home_content
    const { data, error } = await db
      .from("prep_sessions")
      .select("id, stage, stage_type, stage_name, created_at, session_data, take_home_content")
      .eq("user_id", auth.userId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error("[session/takehomes] DB error:", error.message);
      return NextResponse.json({ sessions: [] });
    }

    // Filter to take-home sessions with content
    const sessions = (data ?? [])
      .filter((s) => {
        const isTakeHome =
          s.stage_type === "take_home" ||
          s.stage === "take_home";
        const hasContent =
          s.take_home_content != null ||
          (s.session_data as Record<string, unknown>)?.takeHomeContent != null;
        return isTakeHome && hasContent;
      })
      .map((s) => ({
        id: s.id,
        companyName:
          (s.session_data as Record<string, unknown>)?.companyName as string ??
          "Unknown company",
        stageName: s.stage_name ?? null,
        createdAt: s.created_at,
      }));

    return NextResponse.json({ sessions });
  } catch (err) {
    console.error("[session/takehomes] Error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ sessions: [] });
  }
}
