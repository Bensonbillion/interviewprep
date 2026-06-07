#!/usr/bin/env node
/**
 * Allowlisted `npm audit` gate.
 *
 * Runs `npm audit --json`, collects every high+critical advisory (by
 * GHSA id parsed from `via[].url`), and exits non-zero if any are NOT
 * in ALLOWED_GHSAS below.
 *
 * Used by the CI static job in place of bare `npm audit --audit-level=high`
 * — that gate is binary, so the moment we ship the universal Insight
 * Interview build with 5 known-deferred Next.js advisories it would fail
 * forever and train us to ignore it. This script lets specific known
 * advisories through with a dated reason, while still failing the build
 * on ANY new high-sev advisory.
 *
 * When a follow-up PR patches a deferred advisory, remove its entry
 * from ALLOWED_GHSAS and the gate ratchets up automatically.
 *
 * Local usage:
 *   node scripts/check-audit.mjs
 * CI usage (in .github/workflows/ci.yml):
 *   - run: node scripts/check-audit.mjs
 */

import { execSync } from "node:child_process";

/**
 * Each entry: { ghsa, reason, expires? }.
 * - ghsa: the GHSA-... id as it appears in the advisory URL.
 * - reason: short note, includes the tracking issue/PR.
 * - expires: optional ISO date. If set and now > expires, the script
 *   treats the allowlist entry as STALE and fails the build, so an
 *   allowlist entry can't quietly outlive its reason.
 */
/**
 * ─── Next.js blocker chain ────────────────────────────────────────────
 * All 19 Next.js high-sev advisories below are patched in the 16.1.7+ /
 * 16.2.x line. Bumping past 16.1.6 pulls in a stricter version of
 * eslint-plugin-react-compiler that flags ~80 additional errors in our
 * existing codebase (setState in effect, can't access variable before
 * declared, impure functions during render). Resolving needs either
 * fixing those errors across the codebase or pinning/loosening those
 * specific rules — a real refactor, deserves its own PR.
 *
 * Tracked in issue #22 ("Next security patch + React Compiler lint").
 * Acceptance: 0 high audit, lint green without suppressing
 * react-compiler rules. MUST merge BEFORE Session 3's Stripe code —
 * payment code on unpatched request-smuggling / CSRF / SSRF advisories
 * is unacceptable.
 *
 * When that PR lands, delete every entry below.
 * ──────────────────────────────────────────────────────────────────────
 */
const NEXT_BLOCKER_REASON =
  "Next.js — patched in 16.1.7+ / 16.2.x but the patch ships a stricter eslint-plugin-react-compiler. Blocker chain documented in scripts/check-audit.mjs header. Tracked in #22; MUST land before Session 3 Stripe.";
const NEXT_EXPIRES = "2026-07-15";

const ALLOWED_GHSAS = [
  // Originally-identified 5 (universal Insight Interview launch session, 2026-06-07).
  { ghsa: "GHSA-ggv3-7p47-pfv8", reason: `Next.js HTTP request smuggling in rewrites. ${NEXT_BLOCKER_REASON}`, expires: NEXT_EXPIRES },
  { ghsa: "GHSA-3x4c-7xq6-9pq8", reason: `Next.js unbounded next/image disk cache. ${NEXT_BLOCKER_REASON}`, expires: NEXT_EXPIRES },
  { ghsa: "GHSA-h27x-g6w4-24gq", reason: `Next.js unbounded postponed resume buffering DoS. ${NEXT_BLOCKER_REASON}`, expires: NEXT_EXPIRES },
  { ghsa: "GHSA-mq59-m269-xvcx", reason: `Next.js null origin bypasses Server Actions CSRF. ${NEXT_BLOCKER_REASON}`, expires: NEXT_EXPIRES },
  { ghsa: "GHSA-jcc7-9wpm-mj36", reason: `Next.js null origin bypasses HMR websocket CSRF. ${NEXT_BLOCKER_REASON}`, expires: NEXT_EXPIRES },
  // Additional 14 surfaced once we tried the 16.1.7 patch and exposed the deeper advisory list.
  { ghsa: "GHSA-q4gf-8mx6-v5v3", reason: `Next.js DoS with Server Components. ${NEXT_BLOCKER_REASON}`, expires: NEXT_EXPIRES },
  { ghsa: "GHSA-8h8q-6873-q5fj", reason: `Next.js DoS with Server Components (variant). ${NEXT_BLOCKER_REASON}`, expires: NEXT_EXPIRES },
  { ghsa: "GHSA-26hh-7cqf-hhc6", reason: `Next.js middleware/proxy bypass via segment-prefetch (incomplete-fix follow-up). ${NEXT_BLOCKER_REASON}`, expires: NEXT_EXPIRES },
  { ghsa: "GHSA-3g8h-86w9-wvmq", reason: `Next.js middleware/proxy cache-poisoning via redirects. ${NEXT_BLOCKER_REASON}`, expires: NEXT_EXPIRES },
  { ghsa: "GHSA-ffhc-5mcf-pf4q", reason: `Next.js XSS in App Router with CSP nonces. ${NEXT_BLOCKER_REASON}`, expires: NEXT_EXPIRES },
  { ghsa: "GHSA-vfv6-92ff-j949", reason: `Next.js RSC cache-busting cache-poisoning via collisions. ${NEXT_BLOCKER_REASON}`, expires: NEXT_EXPIRES },
  { ghsa: "GHSA-gx5p-jg67-6x7h", reason: `Next.js XSS in beforeInteractive scripts. ${NEXT_BLOCKER_REASON}`, expires: NEXT_EXPIRES },
  { ghsa: "GHSA-mg66-mrh9-m8jx", reason: `Next.js DoS via connection exhaustion in Cache Components. ${NEXT_BLOCKER_REASON}`, expires: NEXT_EXPIRES },
  { ghsa: "GHSA-h64f-5h5j-jqjh", reason: `Next.js DoS in Image Optimization API. ${NEXT_BLOCKER_REASON}`, expires: NEXT_EXPIRES },
  { ghsa: "GHSA-c4j6-fc7j-m34r", reason: `Next.js SSRF in WebSocket upgrades. ${NEXT_BLOCKER_REASON}`, expires: NEXT_EXPIRES },
  { ghsa: "GHSA-492v-c6pp-mqqv", reason: `Next.js middleware/proxy bypass via dynamic route param injection. ${NEXT_BLOCKER_REASON}`, expires: NEXT_EXPIRES },
  { ghsa: "GHSA-wfc6-r584-vfw7", reason: `Next.js RSC response cache-poisoning. ${NEXT_BLOCKER_REASON}`, expires: NEXT_EXPIRES },
  { ghsa: "GHSA-267c-6grr-h53f", reason: `Next.js middleware/proxy bypass via segment-prefetch (root advisory). ${NEXT_BLOCKER_REASON}`, expires: NEXT_EXPIRES },
  { ghsa: "GHSA-36qx-fr4f-26g5", reason: `Next.js middleware/proxy bypass via Pages Router i18n. ${NEXT_BLOCKER_REASON}`, expires: NEXT_EXPIRES },

  // ─── picomatch — transitive, non-Next ────────────────────────────────
  // Both are reachable only as a deep transitive of dev/test tooling. npm
  // audit fix (non-force) cannot resolve without major-bumping a parent.
  // Low real-world exploitability for our use case but worth tracking in
  // the same follow-up.
  { ghsa: "GHSA-3v7f-55p6-f55p", reason: "picomatch method injection in POSIX char classes. Transitive via test tooling; needs major bump in a parent. Tracked in #22.", expires: NEXT_EXPIRES },
  { ghsa: "GHSA-c2c7-rcm5-vvqj", reason: "picomatch ReDoS via extglob quantifiers. Same transitive path as GHSA-3v7f-55p6-f55p. Tracked in #22.", expires: NEXT_EXPIRES },
];

function parseAuditJson() {
  // npm audit exits non-zero when vulns are found — that's fine, we read
  // stdout regardless. stdio:'pipe' captures it.
  let raw;
  try {
    raw = execSync("npm audit --json", { stdio: ["ignore", "pipe", "ignore"] }).toString();
  } catch (e) {
    raw = (e.stdout ?? Buffer.from("")).toString();
  }
  if (!raw) {
    console.error("check-audit: npm audit produced no output");
    process.exit(1);
  }
  return JSON.parse(raw);
}

function collectHighSeverity(audit) {
  /** @type {Array<{ pkg: string, severity: string, ghsa: string|null, title: string }>} */
  const out = [];
  const vulns = audit.vulnerabilities ?? {};
  for (const [pkg, v] of Object.entries(vulns)) {
    if (v.severity !== "high" && v.severity !== "critical") continue;
    for (const via of v.via ?? []) {
      if (typeof via !== "object") continue;
      const url = via.url ?? "";
      const m = url.match(/(GHSA-[a-z0-9-]+)/i);
      out.push({
        pkg,
        severity: v.severity,
        ghsa: m ? m[1] : null,
        title: via.title ?? "(no title)",
      });
    }
  }
  return out;
}

function checkExpiries() {
  const now = new Date().toISOString().slice(0, 10);
  const stale = ALLOWED_GHSAS.filter((a) => a.expires && a.expires < now);
  if (stale.length > 0) {
    console.error("check-audit: allowlist entries past their expiry date:");
    for (const a of stale) {
      console.error(`  ${a.ghsa}  expired ${a.expires}`);
    }
    console.error(
      "Either patch the advisory or extend the expiry with explicit re-justification."
    );
    process.exit(1);
  }
}

function main() {
  checkExpiries();
  const audit = parseAuditJson();
  const advisories = collectHighSeverity(audit);
  if (advisories.length === 0) {
    console.log("check-audit: no high+critical advisories found.");
    process.exit(0);
  }

  const allowed = new Set(ALLOWED_GHSAS.map((a) => a.ghsa));
  const unexpected = advisories.filter((a) => !a.ghsa || !allowed.has(a.ghsa));
  const allowedSeen = advisories.filter((a) => a.ghsa && allowed.has(a.ghsa));

  if (allowedSeen.length > 0) {
    console.log(`check-audit: ${allowedSeen.length} known-deferred high-sev advisory hit(s):`);
    for (const a of allowedSeen) {
      console.log(`  ALLOW  ${a.severity}  ${a.pkg}  ${a.ghsa}  ${a.title}`);
    }
  }

  if (unexpected.length > 0) {
    console.error(`\ncheck-audit: ${unexpected.length} UNEXPECTED high-sev advisory hit(s):`);
    for (const a of unexpected) {
      console.error(`  FAIL   ${a.severity}  ${a.pkg}  ${a.ghsa ?? "(no GHSA id)"}  ${a.title}`);
    }
    console.error("\nIf any of these are intentional, add to ALLOWED_GHSAS in scripts/check-audit.mjs with a dated reason and tracking issue.");
    process.exit(1);
  }
  console.log("\ncheck-audit: pass — all high-sev advisories are in the allowlist.");
}

main();
