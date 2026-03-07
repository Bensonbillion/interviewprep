import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ADMIN_EMAILS } from "@/lib/admin-config";
import {
  getFailureDimensions,
  getUserAlternatives,
  getQualityTrends,
  detectQualityAlerts,
} from "@/lib/feedback/quality-analyzer";
import { generateOptimizationSignals } from "@/lib/feedback/prompt-optimizer";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !ADMIN_EMAILS.includes(user.email ?? "")) return null;
  return user;
}

export async function GET(req: NextRequest) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const days = Number(req.nextUrl.searchParams.get("days") ?? 30);

    const [failures, alternatives, trends, alerts] = await Promise.all([
      getFailureDimensions(days),
      getUserAlternatives(50),
      getQualityTrends(8),
      detectQualityAlerts(),
    ]);

    const signals = generateOptimizationSignals(failures, alternatives, alerts);

    return NextResponse.json({
      failures,
      alternatives,
      trends,
      alerts,
      signals,
    });
  } catch (err) {
    console.error("Feedback dashboard error:", err);
    return NextResponse.json({ error: "Failed to load feedback data" }, { status: 500 });
  }
}
