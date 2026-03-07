import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ADMIN_EMAILS } from "@/lib/admin-config";
import { aggregateWeeklyMetrics } from "@/lib/feedback/quality-analyzer";
import { updateCompanyPlaybooks } from "@/lib/feedback/prompt-optimizer";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !ADMIN_EMAILS.includes(user.email ?? "")) return null;
  return user;
}

/**
 * POST /api/admin/feedback/aggregate
 * Triggers weekly aggregation. Call from a cron job or manually.
 * Protected by admin auth or CRON_SECRET.
 */
export async function POST(req: NextRequest) {
  // Allow either admin auth or cron secret
  const cronSecret = process.env.CRON_SECRET;
  const isCron = cronSecret && req.headers.get("authorization") === `Bearer ${cronSecret}`;

  if (!isCron) {
    const user = await requireAdmin();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    // Compute the start of the current week (Monday)
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=Sun
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() + mondayOffset);
    weekStart.setHours(0, 0, 0, 0);

    // Also aggregate previous week if not done
    const prevWeekStart = new Date(weekStart);
    prevWeekStart.setDate(prevWeekStart.getDate() - 7);

    const [prevMetrics, currMetrics] = await Promise.all([
      aggregateWeeklyMetrics(prevWeekStart),
      aggregateWeeklyMetrics(weekStart),
    ]);

    const playbooksUpdated = await updateCompanyPlaybooks();

    return NextResponse.json({
      ok: true,
      prevWeek: { weekStart: prevWeekStart.toISOString().slice(0, 10), answerTypes: prevMetrics.length },
      currWeek: { weekStart: weekStart.toISOString().slice(0, 10), answerTypes: currMetrics.length },
      playbooksUpdated,
    });
  } catch (err) {
    console.error("Aggregation failed:", err);
    return NextResponse.json({ error: "Aggregation failed" }, { status: 500 });
  }
}
