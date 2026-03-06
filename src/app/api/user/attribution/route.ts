import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/user/attribution
 *
 * Saves first-touch and last-touch UTM attribution on the user record.
 * Called from the client after sign-up is detected.
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      first_touch_source,
      first_touch_medium,
      first_touch_campaign,
      last_touch_source,
      last_touch_medium,
      last_touch_campaign,
      landing_page,
    } = body;

    const admin = createAdminClient();

    const { error } = await admin
      .from("users")
      .update({
        first_touch_source: first_touch_source || null,
        first_touch_medium: first_touch_medium || null,
        first_touch_campaign: first_touch_campaign || null,
        last_touch_source: last_touch_source || null,
        last_touch_medium: last_touch_medium || null,
        last_touch_campaign: last_touch_campaign || null,
        first_landing_page: landing_page || null,
      })
      .eq("id", user.id);

    if (error) {
      console.warn("Attribution save failed:", error.message);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.warn("Attribution endpoint failed:", err);
    return NextResponse.json({ ok: true }); // Never fail the user request
  }
}
