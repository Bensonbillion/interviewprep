/**
 * Validate redirect URLs to prevent open redirect attacks.
 * Only allows relative paths starting with /.
 */
const ALLOWED_PATHS = [
  "/dashboard",
  "/get-started",
  "/prep",
  "/admin",
  "/onboarding",
];

export function validateRedirectUrl(url: string | null): string {
  if (!url) return "/dashboard";

  // Must start with / and not // (protocol-relative URL)
  if (!url.startsWith("/") || url.startsWith("//")) return "/dashboard";

  // Block any URL containing protocol
  if (url.includes("://")) return "/dashboard";

  // Strip to pathname only (remove query string for prefix check)
  const pathname = url.split("?")[0];

  // Must match an allowed path prefix
  const isAllowed = ALLOWED_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );

  return isAllowed ? url : "/dashboard";
}
