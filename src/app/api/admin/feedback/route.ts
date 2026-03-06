import { NextRequest, NextResponse } from "next/server";
import {
  getFailureDimensions,
  getUserAlternatives,
  getQualityTrends,
  detectQualityAlerts,
} from "@/lib/feedback/quality-analyzer";
import { generateOptimizationSignals } from "@/lib/feedback/prompt-optimizer";

export async function GET(req: NextRequest) {
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
