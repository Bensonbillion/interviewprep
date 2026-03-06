import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validateRedirectUrl } from "@/lib/security/validate-redirect";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const redirectTo = validateRedirectUrl(searchParams.get("redirectTo"));

  // OAuth provider returned an error (e.g. provider not enabled, user denied)
  const oauthError = searchParams.get("error_description") ?? searchParams.get("error");
  if (oauthError && !code) {
    const loginUrl = new URL(`${origin}/auth/login`);
    loginUrl.searchParams.set("error", oauthError);
    loginUrl.searchParams.set("redirectTo", redirectTo);
    return NextResponse.redirect(loginUrl.toString());
  }

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.session) {
      // Detect new user (created within last 60 seconds)
      const createdAt = new Date(data.session.user.created_at).getTime();
      const isNewUser = Date.now() - createdAt < 60_000;
      const sep = redirectTo.includes("?") ? "&" : "?";
      const url = isNewUser
        ? `${origin}${redirectTo}${sep}signup=1`
        : `${origin}${redirectTo}`;
      return NextResponse.redirect(url);
    }
    if (!error) {
      return NextResponse.redirect(`${origin}${redirectTo}`);
    }
    // Code exchange failed — surface the real error
    const loginUrl = new URL(`${origin}/auth/login`);
    loginUrl.searchParams.set("error", error.message);
    loginUrl.searchParams.set("redirectTo", redirectTo);
    return NextResponse.redirect(loginUrl.toString());
  }

  return NextResponse.redirect(`${origin}/auth/login?error=auth_failed`);
}
