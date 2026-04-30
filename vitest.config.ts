import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    include: [
      "tests/unit/**/*.test.ts",
      "tests/unit/**/*.test.tsx",
      "tests/integration/**/*.test.ts",
      "tests/security/**/*.test.ts",
      "tests/ai/**/*.test.ts",
      "tests/seo/**/*.test.ts",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/**/*.ts", "src/**/*.tsx"],
      exclude: [
        "src/**/*.d.ts",
        "src/**/types.ts",
        "node_modules/**",
        "tests/**",
        "**/*.config.*",
        ".next/**",
      ],
      thresholds: {
        // Floor set to current actuals — coverage may only go up from here.
        // When new tests land, ratchet these up in the same PR.
        lines: 11,
        functions: 7,
        branches: 8,
      },
    },
    testTimeout: 30000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
