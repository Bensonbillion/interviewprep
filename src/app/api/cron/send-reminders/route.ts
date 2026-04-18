import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/cron/send-reminders
 * Called by Vercel cron every 15 minutes.
 * Finds sessions with interview_date within the next hour that haven't been reminded.
 * Sends a reminder email with the live mode link.
 *
 * Protected by CRON_SECRET header.
 */
export async function GET(req: NextRequest) {
  const cronSecret = req.headers.get("x-cron-secret") ?? req.headers.get("authorization")?.replace("Bearer ", "");
  if (cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = createAdminClient();
    const now = new Date();
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

    // Find sessions with interview in the next hour, not yet reminded
    const { data: sessions, error } = await db
      .from("prep_sessions")
      .select("id, user_id, interview_date, stage_name, session_data")
      .eq("reminder_sent", false)
      .not("interview_date", "is", null)
      .lte("interview_date", oneHourFromNow.toISOString())
      .gte("interview_date", now.toISOString());

    if (error) {
      console.error("[send-reminders] Query error:", error.message);
      return NextResponse.json({ error: "Query failed" }, { status: 500 });
    }

    if (!sessions || sessions.length === 0) {
      return NextResponse.json({ sent: 0 });
    }

    let sent = 0;

    for (const session of sessions) {
      try {
        // Get user email
        const { data: userData } = await db
          .from("users")
          .select("email")
          .eq("id", session.user_id)
          .single();

        if (!userData?.email) continue;

        const sessionData = (session.session_data ?? {}) as Record<string, unknown>;
        const companyName = (sessionData.companyName as string) ?? "your interview";
        const stageName = session.stage_name ?? "Interview";
        const liveUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "https://interviewprep.roadmapengine.ai"}/prep/${session.id}/live`;

        // Send email via Supabase edge function or direct SMTP
        // For now, log and mark as sent (email provider integration TBD)
        console.log(`[send-reminders] Reminder for ${userData.email}: ${companyName} ${stageName} at ${session.interview_date}`);
        console.log(`  Live mode: ${liveUrl}`);

        // Mark as sent
        await db
          .from("prep_sessions")
          .update({
            reminder_sent: true,
            reminder_sent_at: new Date().toISOString(),
          })
          .eq("id", session.id);

        sent++;
      } catch (err) {
        console.error(`[send-reminders] Failed for session ${session.id}:`, err);
      }
    }

    return NextResponse.json({ sent, total: sessions.length });
  } catch (err) {
    console.error("[send-reminders] Error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
