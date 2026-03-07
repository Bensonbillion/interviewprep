import { NextRequest, NextResponse } from "next/server";
import { verifyApiAuth } from "@/lib/auth/verify";
import { createAdminClient } from "@/lib/supabase/admin";
import { deleteUserData } from "@/lib/privacy/account-deletion";
import { auditLog } from "@/lib/security/audit";

/**
 * POST /api/user/delete-account
 *
 * Deletes all user data from feedback/report tables,
 * recalculates affected company playbooks, then
 * deletes the auth user from Supabase.
 *
 * Requires the user to be authenticated.
 */
export async function POST() {
  try {
    const auth = await verifyApiAuth();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Delete all user-specific data
    const result = await deleteUserData(auth.userId);

    // Delete the auth user (admin API)
    const db = createAdminClient();
    const { error: deleteError } = await db.auth.admin.deleteUser(auth.userId);
    if (deleteError) {
      console.error("Failed to delete auth user:", deleteError);
      // Data is already deleted — log but don't fail the request
    }

    auditLog({
      eventType: "account_deleted",
      userId: auth.userId,
      severity: "warning",
      details: { deleted: result },
    });

    return NextResponse.json({
      ok: true,
      deleted: result,
    });
  } catch (err) {
    console.error("Account deletion failed:", err);
    return NextResponse.json({ error: "Deletion failed" }, { status: 500 });
  }
}
