import "@testing-library/jest-dom";
import { vi } from "vitest";
import dotenv from "dotenv";

// Load .env.local so security tests can use real Supabase credentials
dotenv.config({ path: ".env.local" });

// Mock server-only package (throws in non-Next.js environments)
vi.mock("server-only", () => ({}));

// Fallback env vars for unit tests (won't override .env.local values)
process.env.NEXT_PUBLIC_SUPABASE_URL ??= "http://localhost:54321";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= "test-anon-key";
process.env.SUPABASE_SERVICE_ROLE_KEY ??= "test-service-role-key";
process.env.ANTHROPIC_API_KEY ??= "sk-ant-test-key";
process.env.DATA_ENCRYPTION_KEY ??=
  "test-encryption-key-must-be-at-least-32-chars-long";
process.env.UPSTASH_REDIS_REST_URL ??= "http://localhost:8079";
process.env.UPSTASH_REDIS_REST_TOKEN ??= "test-token";
