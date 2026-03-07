import "server-only";
import dns from "dns/promises";
import net from "net";

/**
 * SSRF prevention for external URL fetching.
 * Blocks private IPs, cloud metadata endpoints, non-HTTPS, and DNS rebinding.
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

function isPrivateIP(ip: string): boolean {
  if (!net.isIP(ip)) return false;
  return PRIVATE_IP_RANGES.some((r) => r.test(ip));
}

/**
 * Synchronous URL validation — checks protocol, credentials, port, hostname.
 * Does NOT check DNS resolution. Use validateExternalUrl for full protection.
 */
export function isUrlSafe(input: string): boolean {
  try {
    const url = new URL(input);
    if (url.protocol !== "https:") return false;
    if (url.username || url.password) return false;
    if (url.port && url.port !== "443") return false;
    const hostname = url.hostname.toLowerCase();
    if (BLOCKED_HOSTNAMES.includes(hostname)) return false;
    if (PRIVATE_IP_RANGES.some((r) => r.test(hostname))) return false;
    return true;
  } catch {
    return false;
  }
}

/**
 * Full async URL validation with DNS resolution check.
 * Catches DNS rebinding attacks where a hostname resolves to a private IP.
 */
export async function validateExternalUrl(
  urlString: string
): Promise<{ valid: boolean; reason?: string }> {
  try {
    const url = new URL(urlString);

    if (url.protocol !== "https:") {
      return { valid: false, reason: "HTTPS required" };
    }

    if (url.username || url.password) {
      return { valid: false, reason: "Credentials not allowed in URL" };
    }

    if (url.port && !["443", ""].includes(url.port)) {
      return { valid: false, reason: "Non-standard port" };
    }

    const hostname = url.hostname.toLowerCase();
    if (BLOCKED_HOSTNAMES.includes(hostname)) {
      return { valid: false, reason: "Blocked hostname" };
    }

    if (isPrivateIP(hostname)) {
      return { valid: false, reason: "Private IP in hostname" };
    }

    // DNS resolution check — catch DNS rebinding
    try {
      const addresses = await dns.resolve4(hostname);
      for (const addr of addresses) {
        if (isPrivateIP(addr)) {
          return { valid: false, reason: "Private IP resolved" };
        }
      }
    } catch {
      // DNS resolution failed — hostname doesn't resolve
      return { valid: false, reason: "DNS resolution failed" };
    }

    return { valid: true };
  } catch {
    return { valid: false, reason: "Invalid URL" };
  }
}
