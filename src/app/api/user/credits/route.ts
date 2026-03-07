import { NextResponse } from "next/server";
import { verifyApiAuth } from "@/lib/auth/verify";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const auth = await verifyApiAuth();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();

    const { data } = await admin
      .from("users")
      .select("credit_balance")
      .eq("id", auth.userId)
      .single();

    const balance = (data as { credit_balance: number } | null)?.credit_balance ?? 0;
    return NextResponse.json({ balance });
  } catch {
    return NextResponse.json({ balance: 0 });
  }
}
