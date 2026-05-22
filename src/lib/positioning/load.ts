import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CompetitiveDynamic, PositioningBrief } from "@/types";

/**
 * Reusable reader for a session's positioning brief + (when applicable)
 * its joined competitive dynamic. This is the seam called out in the
 * Narrative Spine Phase 0 — until now this query was inlined in three
 * routes (/api/positioning, /api/insight-interview, /api/insight-
 * interview/answer). Future cleanup can refactor those to use this
 * helper; this build just introduces the helper for the spine builder
 * (and other downstream consumers).
 *
 * Returns null when no brief exists for the session. When the brief is
 * a switcher / early-career type (competitive_dynamic_id null), the
 * dynamic field on the returned object is null.
 */

export interface PositioningBriefWithDynamic {
  brief: PositioningBrief;
  dynamic: CompetitiveDynamic | null;
}

export async function loadPositioningBriefWithDynamic(
  sessionId: string
): Promise<PositioningBriefWithDynamic | null> {
  const db = createAdminClient();

  const { data: briefRow, error: briefErr } = await db
    .from("positioning_briefs")
    .select("*")
    .eq("session_id", sessionId)
    .maybeSingle();
  if (briefErr || !briefRow) return null;

  const brief: PositioningBrief = {
    id: briefRow.id,
    session_id: briefRow.session_id,
    positioning_type: briefRow.positioning_type,
    anchor_employer: briefRow.anchor_employer,
    anchor_employer_role: briefRow.anchor_employer_role,
    classification_reasoning: briefRow.classification_reasoning,
    classification_confidence: Number(briefRow.classification_confidence),
    classification_signal: briefRow.classification_signal,
    competitive_dynamic_id: briefRow.competitive_dynamic_id,
    transferable_bridges: (briefRow.transferable_bridges ?? []) as PositioningBrief["transferable_bridges"],
    domain_gap_to_close: briefRow.domain_gap_to_close,
    company_hook: briefRow.company_hook,
    generated_at: briefRow.generated_at,
  };

  if (!brief.competitive_dynamic_id) {
    return { brief, dynamic: null };
  }

  const { data: dynRow } = await db
    .from("competitive_dynamics")
    .select("*")
    .eq("id", brief.competitive_dynamic_id)
    .maybeSingle();
  if (!dynRow) return { brief, dynamic: null };

  const dynamic: CompetitiveDynamic = {
    id: dynRow.id,
    anchor_company_id: dynRow.anchor_company_id,
    target_company_id: dynRow.target_company_id,
    competitive_relationship: dynRow.competitive_relationship,
    target_company_wedge: dynRow.target_company_wedge,
    anchor_company_wedge: dynRow.anchor_company_wedge,
    where_target_wins: (dynRow.where_target_wins ?? []) as CompetitiveDynamic["where_target_wins"],
    where_anchor_wins: (dynRow.where_anchor_wins ?? []) as CompetitiveDynamic["where_anchor_wins"],
    shared_buyers: (dynRow.shared_buyers ?? []) as string[],
    substantiated_facts: (dynRow.substantiated_facts ?? []) as CompetitiveDynamic["substantiated_facts"],
    interrogation_lines: (dynRow.interrogation_lines ?? []) as CompetitiveDynamic["interrogation_lines"],
    research_depth: dynRow.research_depth,
    sources: (dynRow.sources ?? []) as CompetitiveDynamic["sources"],
    intel_refreshed_at: dynRow.intel_refreshed_at,
    truths_refreshed_at: dynRow.truths_refreshed_at,
  };

  return { brief, dynamic };
}
