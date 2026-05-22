import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { NarrativeSpine } from "@/types";

/**
 * Reader for a session's narrative_spine. Returns null when no spine
 * has been built (a session created before this build, or one whose
 * /complete handler ran before spine wiring landed). Callers handle
 * the null case by falling back to spine-blind generation — the spine
 * is additive; its absence must not break answer generation.
 */
export async function loadNarrativeSpine(sessionId: string): Promise<NarrativeSpine | null> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("narrative_spines")
    .select("*")
    .eq("session_id", sessionId)
    .maybeSingle();
  if (error) {
    console.warn("[spine] loadNarrativeSpine failed:", error.message);
    return null;
  }
  if (!data) return null;
  return data as NarrativeSpine;
}
