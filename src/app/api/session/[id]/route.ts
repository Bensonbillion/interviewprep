import { NextRequest, NextResponse } from "next/server";
import { verifyApiAuth } from "@/lib/auth/verify";

/**
 * GET /api/session/[id]
 * In v1.0, sessions are stored in sessionStorage on the client.
 * This route is a placeholder for when Supabase session persistence is active.
 * Returns 404 until a session is found in the DB.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyApiAuth();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: "Session ID required" }, { status: 400 });
  }

  // TODO: Query Supabase prep_sessions + generated_answers when DB is connected
  return NextResponse.json(
    { error: "Session not found — client-side session storage is active in v1.0" },
    { status: 404 }
  );
}
