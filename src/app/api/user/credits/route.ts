import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    // Use the session-aware client only for auth
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Use service-role admin client for DB read (bypasses typing issues with generated types)
    const admin = createAdminClient();

    const { data } = await admin
      .from("users")
      .select("credit_balance")
      .eq("id", user.id)
      .single();

    const balance = (data as { credit_balance: number } | null)?.credit_balance ?? 0;
    return NextResponse.json({ balance });
  } catch {
    return NextResponse.json({ balance: 0 });
  }
}
