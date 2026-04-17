import { NextRequest, NextResponse } from "next/server";
import { verifyApiAuth } from "@/lib/auth/verify";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/company-intel/[companyId]
 * Returns company_interview_intel records for a company, sorted by frequency.
 * Used by the stage discovery UI to suggest likely interview stages.
 *
 * companyId is the company_name_normalized value (e.g., "hubspot", "samsara").
 *
 * Response:
 * {
 *   has_intel: boolean,
 *   company_name: string | null,
 *   stages: Array<{
 *     stage_type: string | null,
 *     stage_name: string | null,
 *     typical_order: number | null,
 *     frequency: number,
 *     questions_sample: string[],
 *     format_notes: string | null,
 *   }>
 * }
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    const auth = await verifyApiAuth();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { companyId } = await params;
    const normalized = companyId.toLowerCase().trim();

    if (!normalized || normalized.length > 200) {
      return NextResponse.json({ error: "Invalid company ID" }, { status: 400 });
    }

    const db = createAdminClient();

    // Fetch all intel records for this company
    const { data, error } = await db
      .from("company_interview_intel")
      .select("company_name, stage_type, stage_name, typical_order, common_questions, format_notes")
      .eq("company_name_normalized", normalized)
      .order("typical_order", { ascending: true, nullsFirst: false });

    if (error) {
      console.error("[company-intel] DB error:", error.message);
      return NextResponse.json({ error: "Failed to fetch intel" }, { status: 500 });
    }

    if (!data || data.length === 0) {
      // Also try fetching from interview_questions_reported for crowd-sourced data
      const { data: questions } = await db
        .from("interview_questions_reported")
        .select("question_text, interview_stage, question_category")
        .eq("company_name_normalized", normalized)
        .eq("is_verified", true)
        .order("verification_count", { ascending: false })
        .limit(20);

      if (questions && questions.length > 0) {
        // Group questions by stage and return as lightweight intel
        const stageMap = new Map<string, string[]>();
        for (const q of questions) {
          const stage = q.interview_stage ?? "unknown";
          if (!stageMap.has(stage)) stageMap.set(stage, []);
          stageMap.get(stage)!.push(q.question_text);
        }

        const stages = Array.from(stageMap.entries()).map(([stage, qs]) => ({
          stage_type: null,
          stage_name: stage,
          typical_order: null,
          frequency: qs.length,
          questions_sample: qs.slice(0, 3),
          format_notes: null,
        }));

        return NextResponse.json({
          has_intel: true,
          company_name: normalized,
          stages,
        });
      }

      return NextResponse.json({
        has_intel: false,
        company_name: normalized,
        stages: [],
      });
    }

    // Map DB records to response shape
    const stages = data.map((row) => {
      const questions = (row.common_questions as string[] | null) ?? [];
      return {
        stage_type: row.stage_type ?? null,
        stage_name: row.stage_name ?? null,
        typical_order: row.typical_order ?? null,
        frequency: 1, // Base intel records have frequency 1 — crowd-sourced data accumulates
        questions_sample: questions.slice(0, 3),
        format_notes: row.format_notes ?? null,
      };
    });

    return NextResponse.json({
      has_intel: true,
      company_name: (data[0] as { company_name?: string })?.company_name ?? normalized,
      stages,
    });
  } catch (err) {
    console.error("[company-intel] Error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Failed to fetch company intel" }, { status: 500 });
  }
}
