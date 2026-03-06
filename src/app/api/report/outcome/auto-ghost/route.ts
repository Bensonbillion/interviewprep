import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

function adminDb() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * POST /api/report/outcome/auto-ghost
 *
 * Called by a daily cron job. Auto-sets outcome to 'ghosted' for
 * any interview_report where outcome = 'pending' and created_at > 21 days ago.
 */
export async function POST() {
  try {
    const db = adminDb();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 21);

    const { data, error } = await db
      .from("interview_reports")
      .update({
        outcome: "ghosted",
        outcome_updated_at: new Date().toISOString(),
      })
      .eq("outcome", "pending")
      .lte("created_at", cutoff.toISOString())
      .select("id");

    if (error) throw error;

    return NextResponse.json({
      ok: true,
      autoGhosted: data?.length ?? 0,
    });
  } catch (err) {
    console.error("Auto-ghost failed:", err);
    return NextResponse.json({ error: "Auto-ghost failed" }, { status: 500 });
  }
}
