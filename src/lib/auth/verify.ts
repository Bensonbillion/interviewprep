import "server-only";
import { createClient } from "@/lib/supabase/server";

export interface AuthUser {
  userId: string;
  email: string;
}

/**
 * Verify the current user's auth via Supabase getUser().
 *
 * CRITICAL: Uses getUser() which validates the JWT server-side,
 * NOT getSession() which trusts the local token without verification.
 * After CVE-2025-29927, middleware alone is NOT sufficient — every
 * data access point must verify auth independently.
 *
 * Returns the verified user or null if unauthenticated.
 */
export async function verifyApiAuth(): Promise<AuthUser | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) return null;

    return {
      userId: user.id,
      email: user.email ?? "",
    };
  } catch {
    return null;
  }
}
