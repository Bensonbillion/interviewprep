import { NextRequest, NextResponse } from "next/server";
import { verifyApiAuth } from "@/lib/auth/verify";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/session/validate
 * Checks which session IDs from a list actually exist in the DB for this user.
 * Used by the sidebar to prune ghost sessions from localStorage.
 * Body: { sessionIds: string[] }
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await verifyApiAuth();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const sessionIds = body?.sessionIds;

    if (!Array.isArray(sessionIds) || sessionIds.length === 0) {
      return NextResponse.json({ validIds: [] });
    }

    // Cap at 100 to prevent abuse
    const ids = sessionIds.slice(0, 100).filter((id: unknown) => typeof id === "string");

    const db = createAdminClient();
    const { data } = await db
      .from("prep_sessions")
      .select("id")
      .eq("user_id", auth.userId)
      .in("id", ids);

    const validIds = (data ?? []).map((row: { id: string }) => row.id);

    return NextResponse.json({ validIds });
  } catch {
    return NextResponse.json({ validIds: [] });
  }
}
