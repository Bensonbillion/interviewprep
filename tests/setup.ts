import "@testing-library/jest-dom";
import { vi } from "vitest";

// Mock server-only package (throws in non-Next.js environments)
vi.mock("server-only", () => ({}));

// Mock environment variables for tests
process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
process.env.ANTHROPIC_API_KEY = "sk-ant-test-key";
process.env.DATA_ENCRYPTION_KEY =
  "test-encryption-key-must-be-at-least-32-chars-long";
process.env.UPSTASH_REDIS_REST_URL = "http://localhost:8079";
process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";
