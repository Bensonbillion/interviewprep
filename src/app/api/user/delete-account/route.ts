import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { deleteUserData } from "@/lib/privacy/account-deletion";

function adminDb() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * POST /api/user/delete-account
 *
 * Deletes all user data from feedback/report tables,
 * recalculates affected company playbooks, then
 * deletes the auth user from Supabase.
 *
 * Requires the user to be authenticated.
 */
export async function POST(req: NextRequest) {
  try {
    // Extract user from Authorization header
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = adminDb();
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await db.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Delete all user-specific data
    const result = await deleteUserData(user.id);

    // Delete the auth user (admin API)
    const { error: deleteError } = await db.auth.admin.deleteUser(user.id);
    if (deleteError) {
      console.error("Failed to delete auth user:", deleteError);
      // Data is already deleted — log but don't fail the request
    }

    return NextResponse.json({
      ok: true,
      deleted: result,
    });
  } catch (err) {
    console.error("Account deletion failed:", err);
    return NextResponse.json({ error: "Deletion failed" }, { status: 500 });
  }
}
