import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

function adminDb() {
  return createAdminClient();
}

/**
 * PATCH /api/report/outcome — update interview outcome
 */
export async function PATCH(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      reportId: string;
      outcome: string;
      offerBaseSalary?: number;
      offerOte?: number;
      offerCurrency?: string;
      rejectionFeedback?: string;
      whatWouldDoDifferently?: string;
      nextStage?: string;
    };

    const { reportId, outcome } = body;
    if (!reportId || !outcome) {
      return NextResponse.json({ error: "reportId and outcome required" }, { status: 400 });
    }

    const validOutcomes = ["offer", "advanced", "rejected", "ghosted", "withdrew", "pending"];
    if (!validOutcomes.includes(outcome)) {
      return NextResponse.json({ error: "Invalid outcome" }, { status: 400 });
    }

    const db = adminDb();

    const updateData: Record<string, unknown> = {
      outcome,
      outcome_updated_at: new Date().toISOString(),
    };

    if (outcome === "offer") {
      if (body.offerBaseSalary) updateData.offer_base_salary = body.offerBaseSalary;
      if (body.offerOte) updateData.offer_ote = body.offerOte;
      if (body.offerCurrency) updateData.offer_currency = body.offerCurrency;
    }

    if (outcome === "rejected" || outcome === "advanced") {
      if (body.rejectionFeedback?.trim()) {
        updateData.notes = body.rejectionFeedback.trim();
      }
    }

    const { error } = await db
      .from("interview_reports")
      .update(updateData)
      .eq("id", reportId);

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.warn("Outcome update failed:", err);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

/**
 * GET /api/report/outcome?pending=true — fetch pending reports for nudge cards
 */
export async function GET(req: NextRequest) {
  try {
    const db = adminDb();

    // Fetch pending reports older than 3 days
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const { data, error } = await db
      .from("interview_reports")
      .select("id, prep_session_id, company_name, role_title, stage, interview_date, created_at, outcome")
      .eq("outcome", "pending")
      .lte("created_at", threeDaysAgo.toISOString())
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) throw error;

    return NextResponse.json({ reports: data ?? [] });
  } catch (err) {
    console.warn("Pending reports fetch failed:", err);
    return NextResponse.json({ reports: [] });
  }
}
