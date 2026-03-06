import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

function adminDb() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: NextRequest) {
  try {
    const { interactions } = (await req.json()) as {
      interactions: Array<{
        session_id: string;
        answer_id: string | null;
        user_id: string | null;
        answer_type: string;
        original_text: string | null;
        edited_text: string | null;
        edit_distance_chars: number | null;
        edit_distance_words: number | null;
        edit_type: string | null;
        time_on_card_seconds: number | null;
        card_expanded: boolean;
        card_collapsed_without_reading: boolean;
        copied_to_clipboard: boolean;
        regeneration_count: number;
        regeneration_with_prompt_change: boolean | null;
      }>;
    };

    if (!interactions?.length) {
      return NextResponse.json({ ok: true });
    }

    const db = adminDb();
    await db.from("answer_interactions").insert(interactions);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.warn("Interaction batch insert failed:", err);
    return NextResponse.json({ ok: true });
  }
}
