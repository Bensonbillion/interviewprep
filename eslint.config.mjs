import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // 2026-06-08: leftover Claude Code worktrees under .claude/ were
    // surfacing 43 phantom React Compiler errors locally that CI didn't
    // see (CI's checkout doesn't include .gitignored paths). Pinning
    // the ignore here so the next stray worktree can't resurrect the
    // mystery. Diagnosis history in issue #22.
    ".claude/**",
  ]),
]);

export default eslintConfig;
