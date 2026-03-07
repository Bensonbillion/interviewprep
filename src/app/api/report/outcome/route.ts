import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyApiAuth } from "@/lib/auth/verify";
import { outcomeUpdateSchema } from "@/lib/validation/schemas";

function adminDb() {
  return createAdminClient();
}

/**
 * PATCH /api/report/outcome — update interview outcome
 */
export async function PATCH(req: NextRequest) {
  const auth = await verifyApiAuth();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = outcomeUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { reportId, outcome, ...rest } = parsed.data;
    const db = adminDb();

    const updateData: Record<string, unknown> = {
      outcome,
      outcome_updated_at: new Date().toISOString(),
    };

    if (outcome === "offer") {
      if (rest.offerBaseSalary) updateData.offer_base_salary = rest.offerBaseSalary;
      if (rest.offerOte) updateData.offer_ote = rest.offerOte;
      if (rest.offerCurrency) updateData.offer_currency = rest.offerCurrency;
    }

    if (outcome === "rejected" || outcome === "advanced") {
      if (rest.rejectionFeedback?.trim()) {
        updateData.notes = rest.rejectionFeedback.trim();
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
export async function GET() {
  const auth = await verifyApiAuth();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
