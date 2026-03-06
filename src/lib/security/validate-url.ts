/**
 * Validate external URLs to prevent SSRF attacks.
 * Blocks private IPs, cloud metadata endpoints, and non-HTTPS URLs.
 */

const PRIVATE_IP_RANGES = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^0\./,
  /^100\.(6[4-9]|[7-9]\d|1[0-2]\d|127)\./,
  /^::1$/,
  /^fc00:/,
  /^fe80:/,
  /^fd/,
];

const BLOCKED_HOSTNAMES = [
  "localhost",
  "metadata.google.internal",
  "metadata.google",
  "169.254.169.254",
];

export function isUrlSafe(input: string): boolean {
  try {
    const url = new URL(input);

    // HTTPS only
    if (url.protocol !== "https:") return false;

    // No credentials in URL
    if (url.username || url.password) return false;

    // Standard ports only
    if (url.port && url.port !== "443") return false;

    // Block known dangerous hostnames
    const hostname = url.hostname.toLowerCase();
    if (BLOCKED_HOSTNAMES.includes(hostname)) return false;

    // Block private IP ranges
    if (PRIVATE_IP_RANGES.some((r) => r.test(hostname))) return false;

    return true;
  } catch {
    return false;
  }
}
