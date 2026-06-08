#!/usr/bin/env node
/**
 * Allowlisted `npm audit` gate.
 *
 * Two modes:
 *   • Default (`production` mode): runs `npm audit --omit=dev --json`,
 *     fails CI on any high+critical advisory NOT in ALLOWED_GHSAS.
 *     This is the BLOCKING gate. Production deps are what ships, so a
 *     vuln here is a real attack surface.
 *
 *   • `--mode=dev` (warning mode): runs `npm audit --json` (full tree
 *     including dev deps), reports any high+critical dev-only advisories
 *     as warnings, and exits 0 regardless. Wired into ci.yml as a soft
 *     step. Rationale: dev deps don't ship to production, so a glob
 *     ReDoS in a CLI tool shouldn't block PR merges — but a serious
 *     dev-tier advisory (build-time RCE, supply-chain compromise) is
 *     something we want to see, not something that should go silent
 *     because we drew the gate boundary at production.
 *
 * Allowlist entries fail the build past their `expires` date so an
 * exception can't quietly outlive its reason.
 *
 * Local usage:
 *   node scripts/check-audit.mjs             # production gate
 *   node scripts/check-audit.mjs --mode=dev  # dev-tier warning report
 */

import { execSync } from "node:child_process";

/**
 * Each entry: { ghsa, reason, expires? }.
 *
 * Currently empty. The universal Insight Interview launch session
 * deferred 19 Next.js + 2 picomatch advisories here; issue #22
 * resolved all of them via the 16.1.6 → 16.2.6 surgical bump plus the
 * --omit=dev gate scope (picomatch was dev-only via shadcn → fast-glob
 * → micromatch).
 *
 * If you're adding back: name the GHSA, link a tracking issue, and pick
 * an expiry that an actual human will look at.
 */
const ALLOWED_GHSAS = [];

const MODE = process.argv.includes("--mode=dev") ? "dev" : "production";

function parseAuditJson({ omitDev }) {
  const flag = omitDev ? "--omit=dev" : "";
  const cmd = `npm audit --json ${flag}`.trim();
  let raw;
  try {
    raw = execSync(cmd, { stdio: ["ignore", "pipe", "ignore"] }).toString();
  } catch (e) {
    raw = (e.stdout ?? Buffer.from("")).toString();
  }
  if (!raw) {
    console.error(`check-audit: \`${cmd}\` produced no output`);
    process.exit(1);
  }
  return JSON.parse(raw);
}

function collectHighSeverity(audit) {
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

function runProductionGate() {
  checkExpiries();
  const audit = parseAuditJson({ omitDev: true });
  const advisories = collectHighSeverity(audit);
  if (advisories.length === 0) {
    console.log("check-audit (production): no high+critical advisories.");
    process.exit(0);
  }

  const allowed = new Set(ALLOWED_GHSAS.map((a) => a.ghsa));
  const unexpected = advisories.filter((a) => !a.ghsa || !allowed.has(a.ghsa));
  const allowedSeen = advisories.filter((a) => a.ghsa && allowed.has(a.ghsa));

  if (allowedSeen.length > 0) {
    console.log(`check-audit (production): ${allowedSeen.length} known-deferred hit(s):`);
    for (const a of allowedSeen) {
      console.log(`  ALLOW  ${a.severity}  ${a.pkg}  ${a.ghsa}  ${a.title}`);
    }
  }

  if (unexpected.length > 0) {
    console.error(`\ncheck-audit (production): ${unexpected.length} UNEXPECTED high-sev advisory hit(s):`);
    for (const a of unexpected) {
      console.error(`  FAIL   ${a.severity}  ${a.pkg}  ${a.ghsa ?? "(no GHSA id)"}  ${a.title}`);
    }
    console.error("\nIf any are intentional, add to ALLOWED_GHSAS in scripts/check-audit.mjs with a dated reason and tracking issue.");
    process.exit(1);
  }
  console.log("\ncheck-audit (production): pass — all high-sev advisories are in the allowlist.");
}

function runDevWarning() {
  // Find advisories present in the full tree but NOT in the production
  // tree. Those are dev-only — we want them visible but not blocking.
  const fullAudit = parseAuditJson({ omitDev: false });
  const prodAudit = parseAuditJson({ omitDev: true });

  const prodGhsas = new Set(
    collectHighSeverity(prodAudit).map((a) => a.ghsa).filter(Boolean)
  );
  const devOnly = collectHighSeverity(fullAudit).filter(
    (a) => a.ghsa && !prodGhsas.has(a.ghsa)
  );

  if (devOnly.length === 0) {
    console.log("check-audit (dev): no dev-only high+critical advisories.");
    return; // exit 0
  }
  console.log(`::warning::check-audit (dev): ${devOnly.length} high-sev advisory hit(s) in DEV-ONLY dep tree:`);
  for (const a of devOnly) {
    console.log(`  WARN   ${a.severity}  ${a.pkg}  ${a.ghsa ?? "(no GHSA id)"}  ${a.title}`);
  }
  console.log(
    "\nThese do NOT ship to production and do not block CI. Triage if they look serious " +
      "(build-time RCE, supply-chain compromise) rather than a glob ReDoS or similar low-impact lib."
  );
}

if (MODE === "dev") {
  runDevWarning();
} else {
  runProductionGate();
}
