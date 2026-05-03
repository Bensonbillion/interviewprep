/**
 * RLS Policy Verification Tests
 *
 * These tests verify that Supabase Row Level Security policies correctly
 * isolate user data. They use real Supabase connections with two test users
 * and a service_role client to verify access patterns.
 *
 * Required env vars:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
 *   SUPABASE_SECRET_KEY
 *   TEST_USER_PASSWORD  (password for paulhills566@gmail.com)
 *
 * User B is created/destroyed automatically via the admin API.
 *
 * Run: npm run test:security
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

// ── Setup ────────────────────────────────────────────────────────────────────

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SECRET_KEY!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

const TEST_USER_A_EMAIL = "bensonegemonye@yahoo.com";
const TEST_USER_B_EMAIL = "rls-test-user-b@test-only.local";
const TEST_USER_B_PASSWORD = "RLS-test-b-" + Math.random().toString(36).slice(2);

// Skip entire suite if env vars are missing (CI without Supabase)
const canRun = supabaseUrl && serviceRoleKey && anonKey &&
  process.env.TEST_USER_PASSWORD;

const describeRLS = canRun ? describe : describe.skip;

// Service role client — bypasses RLS
let admin: SupabaseClient;

// User-scoped clients — subject to RLS
let clientA: SupabaseClient;
let clientB: SupabaseClient;

// User IDs
let userAId: string;
let userBId: string;

// Track IDs for cleanup
const cleanupIds: { table: string; id: string }[] = [];

function trackForCleanup(table: string, id: string) {
  cleanupIds.push({ table, id });
}

describeRLS("RLS Policy Verification", () => {
  beforeAll(async () => {
    // Service role client — bypasses RLS
    admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Sign in User A (paulhills566@gmail.com — real account)
    clientA = createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: authA, error: errA } = await clientA.auth.signInWithPassword({
      email: TEST_USER_A_EMAIL,
      password: process.env.TEST_USER_PASSWORD!,
    });
    if (errA) throw new Error(`User A login failed: ${errA.message}`);
    userAId = authA.user!.id;

    // Create User B via admin API (ephemeral — cleaned up in afterAll)
    const { data: createdB, error: createErr } = await admin.auth.admin.createUser({
      email: TEST_USER_B_EMAIL,
      password: TEST_USER_B_PASSWORD,
      email_confirm: true,
    });
    if (createErr) throw new Error(`User B creation failed: ${createErr.message}`);
    userBId = createdB.user.id;

    // Sign in User B
    clientB = createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: authB, error: errB } = await clientB.auth.signInWithPassword({
      email: TEST_USER_B_EMAIL,
      password: TEST_USER_B_PASSWORD,
    });
    if (errB) throw new Error(`User B login failed: ${errB.message}`);
  });

  afterAll(async () => {
    // Clean up test data in reverse order (handle FK deps)
    for (const { table, id } of cleanupIds.reverse()) {
      await admin.from(table).delete().eq("id", id);
    }
    // Delete ephemeral User B (cascades to users table via FK)
    if (userBId) {
      await admin.auth.admin.deleteUser(userBId);
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // USERS TABLE
  // Policy: select own (auth.uid()=id), update own, insert service_role only
  // ═══════════════════════════════════════════════════════════════════════════

  describe("users", () => {
    it("User A can SELECT own row", async () => {
      const { data, error } = await clientA.from("users").select("*").eq("id", userAId).single();
      expect(error).toBeNull();
      expect(data?.id).toBe(userAId);
    });

    it("User A CANNOT select User B's row", async () => {
      const { data } = await clientA.from("users").select("*").eq("id", userBId).maybeSingle();
      expect(data).toBeNull();
    });

    it("User A can UPDATE own row", async () => {
      const { error } = await clientA.from("users").update({ updated_at: new Date().toISOString() }).eq("id", userAId);
      expect(error).toBeNull();
    });

    it("User A CANNOT update User B's row", async () => {
      // Update should silently affect 0 rows (RLS filters it out)
      const { data, error } = await clientA
        .from("users")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", userBId)
        .select();
      // Either error or empty result
      expect(data?.length ?? 0).toBe(0);
    });

    it("User A CANNOT insert into users (service_role only)", async () => {
      const { error } = await clientA.from("users").insert({
        id: crypto.randomUUID(),
        email: "rls-test-should-fail@test.com",
        credit_balance: 0,
      });
      expect(error).not.toBeNull();
    });

    it("Unauthenticated client gets nothing", async () => {
      const anon = createClient(supabaseUrl, anonKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { data } = await anon.from("users").select("*");
      expect(data?.length ?? 0).toBe(0);
    });

    it("User A CANNOT delete own user row (no delete policy)", async () => {
      const { error } = await clientA.from("users").delete().eq("id", userAId);
      // Should either error or affect 0 rows
      if (!error) {
        // If no error, verify row still exists via admin
        const { data } = await admin.from("users").select("id").eq("id", userAId).single();
        expect(data?.id).toBe(userAId);
      }
    });

    it("Service role can read all users", async () => {
      const { data, error } = await admin.from("users").select("id");
      expect(error).toBeNull();
      expect(data!.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PARSED_RESUMES TABLE
  // Policy: select own or null, insert own or null + service_role, update own
  // ═══════════════════════════════════════════════════════════════════════════

  describe("parsed_resumes", () => {
    let resumeAId: string;
    let resumeBId: string;

    beforeAll(async () => {
      // Seed resumes via service role
      const { data: rA } = await admin.from("parsed_resumes").insert({
        user_id: userAId,
        raw_text: "RLS test resume A",
        background_type: "other",
      }).select("id").single();
      resumeAId = rA!.id;
      trackForCleanup("parsed_resumes", resumeAId);

      const { data: rB } = await admin.from("parsed_resumes").insert({
        user_id: userBId,
        raw_text: "RLS test resume B",
        background_type: "other",
      }).select("id").single();
      resumeBId = rB!.id;
      trackForCleanup("parsed_resumes", resumeBId);
    });

    it("User A can SELECT own resume", async () => {
      const { data } = await clientA.from("parsed_resumes").select("*").eq("id", resumeAId).single();
      expect(data?.id).toBe(resumeAId);
    });

    it("User A CANNOT select User B's resume", async () => {
      const { data } = await clientA.from("parsed_resumes").select("*").eq("id", resumeBId).maybeSingle();
      expect(data).toBeNull();
    });

    it("User A can INSERT with own user_id", async () => {
      const { data, error } = await clientA.from("parsed_resumes").insert({
        user_id: userAId,
        raw_text: "RLS insert test",
        background_type: "other",
      }).select("id").single();
      expect(error).toBeNull();
      if (data) trackForCleanup("parsed_resumes", data.id);
    });

    it("User A CANNOT insert with User B's user_id", async () => {
      const { error } = await clientA.from("parsed_resumes").insert({
        user_id: userBId,
        raw_text: "Should fail",
        background_type: "other",
      });
      expect(error).not.toBeNull();
    });

    it("User A can UPDATE own resume", async () => {
      const { error } = await clientA.from("parsed_resumes").update({ raw_text: "Updated A" }).eq("id", resumeAId);
      expect(error).toBeNull();
    });

    it("User A CANNOT update User B's resume", async () => {
      const { data } = await clientA
        .from("parsed_resumes")
        .update({ raw_text: "Hacked" })
        .eq("id", resumeBId)
        .select();
      expect(data?.length ?? 0).toBe(0);
    });

    it("User A CANNOT delete resumes (no delete policy)", async () => {
      const { error } = await clientA.from("parsed_resumes").delete().eq("id", resumeAId);
      if (!error) {
        const { data } = await admin.from("parsed_resumes").select("id").eq("id", resumeAId).single();
        expect(data?.id).toBe(resumeAId);
      }
    });

    it("Unauthenticated gets nothing", async () => {
      const anon = createClient(supabaseUrl, anonKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { data } = await anon.from("parsed_resumes").select("*");
      expect(data?.length ?? 0).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPANY_PROFILES TABLE
  // Policy: select all authenticated, insert/update service_role only
  // ═══════════════════════════════════════════════════════════════════════════

  describe("company_profiles", () => {
    let companyId: string;

    beforeAll(async () => {
      const { data } = await admin.from("company_profiles").insert({
        company_name: `RLS Test Co ${Date.now()}`,
        profile_data: { test: true },
        source: "manual",
      }).select("id").single();
      companyId = data!.id;
      trackForCleanup("company_profiles", companyId);
    });

    it("Any authenticated user can SELECT company profiles", async () => {
      const { data } = await clientA.from("company_profiles").select("*").eq("id", companyId).single();
      expect(data?.id).toBe(companyId);
    });

    it("User B can also SELECT the same profile", async () => {
      const { data } = await clientB.from("company_profiles").select("*").eq("id", companyId).single();
      expect(data?.id).toBe(companyId);
    });

    it("Authenticated user CANNOT insert company profiles", async () => {
      const { error } = await clientA.from("company_profiles").insert({
        company_name: `Unauthorized Co ${Date.now()}`,
        profile_data: {},
        source: "manual",
      });
      expect(error).not.toBeNull();
    });

    it("Authenticated user CANNOT update company profiles", async () => {
      const { data } = await clientA
        .from("company_profiles")
        .update({ company_name: "Hacked" })
        .eq("id", companyId)
        .select();
      expect(data?.length ?? 0).toBe(0);
    });

    it("Authenticated user CANNOT delete company profiles", async () => {
      const { error } = await clientA.from("company_profiles").delete().eq("id", companyId);
      if (!error) {
        const { data } = await admin.from("company_profiles").select("id").eq("id", companyId).single();
        expect(data?.id).toBe(companyId);
      }
    });

    it("Unauthenticated CANNOT read company profiles", async () => {
      const anon = createClient(supabaseUrl, anonKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { data } = await anon.from("company_profiles").select("*").eq("id", companyId).maybeSingle();
      // NOTE: If this fails, run in SQL Editor:
      //   drop policy if exists "company_profiles_select" on company_profiles;
      //   create policy "company_profiles_select_auth" on company_profiles
      //     for select to authenticated using (true);
      expect(data).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PREP_SESSIONS TABLE
  // Policy: select own or null, insert own or null, update own or null
  // ═══════════════════════════════════════════════════════════════════════════

  describe("prep_sessions", () => {
    let sessionAId: string;
    let sessionBId: string;

    beforeAll(async () => {
      const { data: sA } = await admin.from("prep_sessions").insert({
        user_id: userAId,
        job_description: "RLS test JD",
        target_role: "SDR",
        role_type: "sdr_bdr",
        stage: "recruiter",
      }).select("id").single();
      sessionAId = sA!.id;
      trackForCleanup("prep_sessions", sessionAId);

      const { data: sB } = await admin.from("prep_sessions").insert({
        user_id: userBId,
        job_description: "RLS test JD B",
        target_role: "AE",
        role_type: "account_executive",
        stage: "hiring_manager",
      }).select("id").single();
      sessionBId = sB!.id;
      trackForCleanup("prep_sessions", sessionBId);
    });

    it("User A can SELECT own sessions", async () => {
      const { data } = await clientA.from("prep_sessions").select("*").eq("id", sessionAId).single();
      expect(data?.id).toBe(sessionAId);
    });

    it("User A CANNOT select User B's sessions", async () => {
      const { data } = await clientA.from("prep_sessions").select("*").eq("id", sessionBId).maybeSingle();
      expect(data).toBeNull();
    });

    it("User A can INSERT with own user_id", async () => {
      const { data, error } = await clientA.from("prep_sessions").insert({
        user_id: userAId,
        job_description: "Insert test",
        target_role: "SDR",
        role_type: "sdr_bdr",
        stage: "recruiter",
      }).select("id").single();
      expect(error).toBeNull();
      if (data) trackForCleanup("prep_sessions", data.id);
    });

    it("User A CANNOT insert with User B's user_id", async () => {
      const { error } = await clientA.from("prep_sessions").insert({
        user_id: userBId,
        job_description: "Should fail",
        target_role: "SDR",
        role_type: "sdr_bdr",
        stage: "recruiter",
      });
      expect(error).not.toBeNull();
    });

    it("User A can UPDATE own session", async () => {
      const { error } = await clientA.from("prep_sessions").update({ target_role: "Updated SDR" }).eq("id", sessionAId);
      expect(error).toBeNull();
    });

    it("User A CANNOT update User B's session", async () => {
      const { data } = await clientA
        .from("prep_sessions")
        .update({ target_role: "Hacked" })
        .eq("id", sessionBId)
        .select();
      expect(data?.length ?? 0).toBe(0);
    });

    it("User A CANNOT delete sessions (no delete policy)", async () => {
      const { error } = await clientA.from("prep_sessions").delete().eq("id", sessionAId);
      if (!error) {
        const { data } = await admin.from("prep_sessions").select("id").eq("id", sessionAId).single();
        expect(data?.id).toBe(sessionAId);
      }
    });

    it("Unauthenticated gets nothing", async () => {
      const anon = createClient(supabaseUrl, anonKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { data } = await anon.from("prep_sessions").select("*");
      expect(data?.length ?? 0).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // GENERATED_ANSWERS TABLE
  // Policy: select own or null, insert own or null, update own or null
  // ═══════════════════════════════════════════════════════════════════════════

  describe("generated_answers", () => {
    let answerAId: string;
    let answerBId: string;
    let sessionAId: string;
    let sessionBId: string;

    beforeAll(async () => {
      // Need sessions first (FK)
      const { data: sA } = await admin.from("prep_sessions").insert({
        user_id: userAId,
        job_description: "Answer RLS test",
        target_role: "SDR",
        role_type: "sdr_bdr",
        stage: "recruiter",
      }).select("id").single();
      sessionAId = sA!.id;
      trackForCleanup("prep_sessions", sessionAId);

      const { data: sB } = await admin.from("prep_sessions").insert({
        user_id: userBId,
        job_description: "Answer RLS test B",
        target_role: "AE",
        role_type: "account_executive",
        stage: "hiring_manager",
      }).select("id").single();
      sessionBId = sB!.id;
      trackForCleanup("prep_sessions", sessionBId);

      const { data: aA } = await admin.from("generated_answers").insert({
        session_id: sessionAId,
        user_id: userAId,
        answer_type: "tell_me_about_yourself",
        content: "Answer A content",
        status: "completed",
      }).select("id").single();
      answerAId = aA!.id;
      trackForCleanup("generated_answers", answerAId);

      const { data: aB } = await admin.from("generated_answers").insert({
        session_id: sessionBId,
        user_id: userBId,
        answer_type: "why_sales",
        content: "Answer B content",
        status: "completed",
      }).select("id").single();
      answerBId = aB!.id;
      trackForCleanup("generated_answers", answerBId);
    });

    it("User A can SELECT own answers", async () => {
      const { data } = await clientA.from("generated_answers").select("*").eq("id", answerAId).single();
      expect(data?.id).toBe(answerAId);
    });

    it("User A CANNOT select User B's answers", async () => {
      const { data } = await clientA.from("generated_answers").select("*").eq("id", answerBId).maybeSingle();
      expect(data).toBeNull();
    });

    it("User A can INSERT with own user_id", async () => {
      const { data, error } = await clientA.from("generated_answers").insert({
        session_id: sessionAId,
        user_id: userAId,
        answer_type: "why_this_company",
        content: "Insert test",
        status: "completed",
      }).select("id").single();
      expect(error).toBeNull();
      if (data) trackForCleanup("generated_answers", data.id);
    });

    it("User A CANNOT insert with User B's user_id", async () => {
      const { error } = await clientA.from("generated_answers").insert({
        session_id: sessionBId,
        user_id: userBId,
        answer_type: "why_sales",
        content: "Should fail",
        status: "completed",
      });
      expect(error).not.toBeNull();
    });

    it("User A can UPDATE own answer", async () => {
      const { error } = await clientA.from("generated_answers").update({ content: "Updated A" }).eq("id", answerAId);
      expect(error).toBeNull();
    });

    it("User A CANNOT update User B's answer", async () => {
      const { data } = await clientA
        .from("generated_answers")
        .update({ content: "Hacked" })
        .eq("id", answerBId)
        .select();
      expect(data?.length ?? 0).toBe(0);
    });

    it("Unauthenticated gets nothing", async () => {
      const anon = createClient(supabaseUrl, anonKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { data } = await anon.from("generated_answers").select("*");
      expect(data?.length ?? 0).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CREDIT_TRANSACTIONS TABLE
  // Policy: select own, insert service_role only
  // ═══════════════════════════════════════════════════════════════════════════

  describe("credit_transactions", () => {
    let txAId: string;
    let txBId: string;

    beforeAll(async () => {
      const { data: tA } = await admin.from("credit_transactions").insert({
        user_id: userAId,
        amount: 1,
        transaction_type: "admin_grant",
        description: "RLS test credit A",
      }).select("id").single();
      txAId = tA!.id;
      trackForCleanup("credit_transactions", txAId);

      const { data: tB } = await admin.from("credit_transactions").insert({
        user_id: userBId,
        amount: 1,
        transaction_type: "admin_grant",
        description: "RLS test credit B",
      }).select("id").single();
      txBId = tB!.id;
      trackForCleanup("credit_transactions", txBId);
    });

    it("User A can SELECT own transactions", async () => {
      const { data } = await clientA.from("credit_transactions").select("*").eq("id", txAId).single();
      expect(data?.id).toBe(txAId);
    });

    it("User A CANNOT select User B's transactions", async () => {
      const { data } = await clientA.from("credit_transactions").select("*").eq("id", txBId).maybeSingle();
      expect(data).toBeNull();
    });

    it("User A CANNOT insert credit transactions (service_role only)", async () => {
      const { error } = await clientA.from("credit_transactions").insert({
        user_id: userAId,
        amount: 999,
        transaction_type: "admin_grant",
        description: "Hacked credits",
      });
      expect(error).not.toBeNull();
    });

    it("User A CANNOT update transactions (no update policy)", async () => {
      const { data } = await clientA
        .from("credit_transactions")
        .update({ amount: 999 })
        .eq("id", txAId)
        .select();
      expect(data?.length ?? 0).toBe(0);
    });

    it("User A CANNOT delete transactions (no delete policy)", async () => {
      const { error } = await clientA.from("credit_transactions").delete().eq("id", txAId);
      if (!error) {
        const { data } = await admin.from("credit_transactions").select("id").eq("id", txAId).single();
        expect(data?.id).toBe(txAId);
      }
    });

    it("Unauthenticated gets nothing", async () => {
      const anon = createClient(supabaseUrl, anonKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { data } = await anon.from("credit_transactions").select("*");
      expect(data?.length ?? 0).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // KNOWLEDGE_DOCUMENTS & KNOWLEDGE_CHUNKS
  // Policy: select authenticated, write service_role only
  // ═══════════════════════════════════════════════════════════════════════════

  describe("knowledge_documents", () => {
    let docId: string;

    beforeAll(async () => {
      const { data } = await admin.from("knowledge_documents").insert({
        title: "RLS Test Doc",
        content: "Test knowledge content",
        source_type: "knowledge_base",
      }).select("id").single();
      docId = data!.id;
      trackForCleanup("knowledge_documents", docId);
    });

    it("Authenticated user can SELECT knowledge docs", async () => {
      const { data } = await clientA.from("knowledge_documents").select("*").eq("id", docId).single();
      expect(data?.id).toBe(docId);
    });

    it("Authenticated user CANNOT insert knowledge docs", async () => {
      const { error } = await clientA.from("knowledge_documents").insert({
        title: "Unauthorized",
        content: "Should fail",
        source_type: "knowledge_base",
      });
      expect(error).not.toBeNull();
    });

    it("Authenticated user CANNOT update knowledge docs", async () => {
      const { data } = await clientA
        .from("knowledge_documents")
        .update({ title: "Hacked" })
        .eq("id", docId)
        .select();
      expect(data?.length ?? 0).toBe(0);
    });

    it("Authenticated user CANNOT delete knowledge docs", async () => {
      const { error } = await clientA.from("knowledge_documents").delete().eq("id", docId);
      if (!error) {
        const { data } = await admin.from("knowledge_documents").select("id").eq("id", docId).single();
        expect(data?.id).toBe(docId);
      }
    });

    it("Unauthenticated gets nothing", async () => {
      const anon = createClient(supabaseUrl, anonKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { data } = await anon.from("knowledge_documents").select("*");
      expect(data?.length ?? 0).toBe(0);
    });
  });

  describe("knowledge_chunks", () => {
    let docId: string;
    let chunkId: string;

    beforeAll(async () => {
      const { data: doc } = await admin.from("knowledge_documents").insert({
        title: "RLS Chunk Test Doc",
        content: "Chunk test content",
        source_type: "knowledge_base",
      }).select("id").single();
      docId = doc!.id;
      trackForCleanup("knowledge_documents", docId);

      const { data: chunk } = await admin.from("knowledge_chunks").insert({
        document_id: docId,
        chunk_index: 0,
        content: "Chunk test content",
      }).select("id").single();
      chunkId = chunk!.id;
      trackForCleanup("knowledge_chunks", chunkId);
    });

    it("Authenticated user can SELECT knowledge chunks", async () => {
      const { data } = await clientA.from("knowledge_chunks").select("*").eq("id", chunkId).single();
      expect(data?.id).toBe(chunkId);
    });

    it("Authenticated user CANNOT insert chunks", async () => {
      const { error } = await clientA.from("knowledge_chunks").insert({
        document_id: docId,
        chunk_index: 1,
        content: "Unauthorized chunk",
      });
      expect(error).not.toBeNull();
    });

    it("Unauthenticated gets nothing", async () => {
      const anon = createClient(supabaseUrl, anonKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { data } = await anon.from("knowledge_chunks").select("*");
      expect(data?.length ?? 0).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECURITY_AUDIT_LOG
  // Policy: NO policies = service_role only (no client access at all)
  // ═══════════════════════════════════════════════════════════════════════════

  describe("security_audit_log", () => {
    it("Authenticated user CANNOT select audit logs", async () => {
      const { data } = await clientA.from("security_audit_log").select("*");
      expect(data?.length ?? 0).toBe(0);
    });

    it("Authenticated user CANNOT insert audit logs", async () => {
      const { error } = await clientA.from("security_audit_log").insert({
        event_type: "test_event",
        severity: "info",
      });
      expect(error).not.toBeNull();
    });

    it("Unauthenticated CANNOT access audit logs", async () => {
      const anon = createClient(supabaseUrl, anonKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { data } = await anon.from("security_audit_log").select("*");
      expect(data?.length ?? 0).toBe(0);
    });

    it("Service role CAN insert and read audit logs", async () => {
      const { data, error } = await admin.from("security_audit_log").insert({
        event_type: "rls_test",
        severity: "info",
        details: { test: true },
      }).select("id").single();
      expect(error).toBeNull();
      expect(data?.id).toBeTruthy();
      if (data) trackForCleanup("security_audit_log", data.id);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPANY_SEO_PAGES
  // Policy: public read (published only), service_role full access
  // ═══════════════════════════════════════════════════════════════════════════

  describe("company_seo_pages", () => {
    let publishedId: string;
    let unpublishedId: string;
    let tableExists = true;

    beforeAll(async () => {
      // Check if table exists (migration 012 may not be applied)
      const { error: probeErr } = await admin.from("company_seo_pages").select("id").limit(0);
      if (probeErr) {
        tableExists = false;
        return;
      }

      const { data: pub } = await admin.from("company_seo_pages").insert({
        company_slug: `rls-test-${Date.now()}`,
        role_slug: "sdr",
        company_name: "RLS Test Published",
        role_title: "SDR",
        meta_title: "Test",
        meta_description: "Test",
        h1_title: "Test",
        company_overview: "Test overview",
        questions: [{ q: "test?" }],
        is_published: true,
      }).select("id").single();
      publishedId = pub!.id;
      trackForCleanup("company_seo_pages", publishedId);

      const { data: unpub } = await admin.from("company_seo_pages").insert({
        company_slug: `rls-unpub-${Date.now()}`,
        role_slug: "ae",
        company_name: "RLS Test Unpublished",
        role_title: "AE",
        meta_title: "Test",
        meta_description: "Test",
        h1_title: "Test",
        company_overview: "Test overview",
        questions: [{ q: "test?" }],
        is_published: false,
      }).select("id").single();
      unpublishedId = unpub!.id;
      trackForCleanup("company_seo_pages", unpublishedId);
    });

    it("Unauthenticated CAN read published SEO pages", async ({ skip }) => {
      if (!tableExists) skip();
      const anon = createClient(supabaseUrl, anonKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { data } = await anon.from("company_seo_pages").select("*").eq("id", publishedId).maybeSingle();
      expect(data?.id).toBe(publishedId);
    });

    it("Unauthenticated CANNOT read unpublished SEO pages", async ({ skip }) => {
      if (!tableExists) skip();
      const anon = createClient(supabaseUrl, anonKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { data } = await anon.from("company_seo_pages").select("*").eq("id", unpublishedId).maybeSingle();
      expect(data).toBeNull();
    });

    it("Authenticated user CANNOT insert SEO pages", async ({ skip }) => {
      if (!tableExists) skip();
      const { error } = await clientA.from("company_seo_pages").insert({
        company_slug: "unauthorized",
        role_slug: "sdr",
        company_name: "Hack",
        role_title: "SDR",
        meta_title: "x",
        meta_description: "x",
        h1_title: "x",
        company_overview: "x",
        questions: [],
      });
      expect(error).not.toBeNull();
    });

    it("Authenticated user CANNOT update SEO pages", async ({ skip }) => {
      if (!tableExists) skip();
      const { data } = await clientA
        .from("company_seo_pages")
        .update({ company_name: "Hacked" })
        .eq("id", publishedId)
        .select();
      expect(data?.length ?? 0).toBe(0);
    });

    it("Authenticated user CANNOT delete SEO pages", async ({ skip }) => {
      if (!tableExists) skip();
      const { error } = await clientA.from("company_seo_pages").delete().eq("id", publishedId);
      if (!error) {
        const { data } = await admin.from("company_seo_pages").select("id").eq("id", publishedId).single();
        expect(data?.id).toBe(publishedId);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SERVICE-ROLE-ONLY TABLES (feedback/intelligence from migrations 009/010)
  // session_events, answer_voice_samples, session_confidence_scores,
  // interview_reports, answer_interactions, answer_explicit_feedback,
  // session_feedback, interview_questions_reported, company_playbooks,
  // prompt_quality_metrics
  // ═══════════════════════════════════════════════════════════════════════════

  describe("service_role-only tables (feedback/analytics)", () => {
    const serviceRoleOnlyTables = [
      "session_events",
      "answer_voice_samples",
      "session_confidence_scores",
      "interview_reports",
      "prompt_quality_metrics",
    ];

    for (const table of serviceRoleOnlyTables) {
      it(`${table}: authenticated CANNOT select`, async () => {
        const { data } = await clientA.from(table).select("*").limit(1);
        expect(data?.length ?? 0).toBe(0);
      });

      it(`${table}: authenticated CANNOT insert`, async () => {
        const { error } = await clientA.from(table).insert({ id: crypto.randomUUID() });
        expect(error).not.toBeNull();
      });

      it(`${table}: unauthenticated CANNOT access`, async () => {
        const anon = createClient(supabaseUrl, anonKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        });
        const { data } = await anon.from(table).select("*").limit(1);
        expect(data?.length ?? 0).toBe(0);
      });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TABLES WITH users_select_own + service_role_all (from migration 010)
  // answer_interactions, answer_explicit_feedback, session_feedback
  // ═══════════════════════════════════════════════════════════════════════════

  describe("user-readable feedback tables", () => {
    const tablesWithUserRead = [
      "answer_interactions",
      "answer_explicit_feedback",
      "session_feedback",
    ];

    for (const table of tablesWithUserRead) {
      it(`${table}: User A can only see own rows (not User B)`, async () => {
        // Base row — session_feedback doesn't have answer_type
        const baseA: Record<string, unknown> = { user_id: userAId, session_id: "rls-test-session-a" };
        const baseB: Record<string, unknown> = { user_id: userBId, session_id: "rls-test-session-b" };

        if (table !== "session_feedback") {
          baseA.answer_type = "tell_me_about_yourself";
          baseB.answer_type = "why_sales";
        }
        if (table === "answer_explicit_feedback") {
          baseA.rating = 4;
          baseB.rating = 3;
        }

        const { data: dA } = await admin.from(table).insert(baseA).select("id").single();
        const { data: dB } = await admin.from(table).insert(baseB).select("id").single();
        if (dA) trackForCleanup(table, dA.id);
        if (dB) trackForCleanup(table, dB.id);

        // User A should see own row
        const { data: aResult } = await clientA.from(table).select("*").eq("id", dA!.id).maybeSingle();
        expect(aResult?.id).toBe(dA!.id);

        // User A should NOT see User B's row
        const { data: bResult } = await clientA.from(table).select("*").eq("id", dB!.id).maybeSingle();
        expect(bResult).toBeNull();
      });

      it(`${table}: authenticated CANNOT insert (service_role only)`, async () => {
        const payload: Record<string, unknown> = {
          user_id: userAId,
          session_id: "rls-test-direct",
        };
        if (table !== "session_feedback") payload.answer_type = "tell_me_about_yourself";
        if (table === "answer_explicit_feedback") payload.rating = 4;

        const { error } = await clientA.from(table).insert(payload);
        expect(error).not.toBeNull();
      });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // INTERVIEW_QUESTIONS_REPORTED
  // Policy: authenticated_read_questions (all auth can read), service_role_all
  // ═══════════════════════════════════════════════════════════════════════════

  describe("interview_questions_reported", () => {
    it("Authenticated user can read questions", async () => {
      // Insert via admin
      const { data: report } = await admin.from("interview_reports").insert({
        user_id: userAId,
        company_name: "RLS Test Co",
        role_title: "SDR",
        stage: "recruiter",
      }).select("id").single();
      if (report) trackForCleanup("interview_reports", report.id);

      const { data: q } = await admin.from("interview_questions_reported").insert({
        report_id: report!.id,
        user_id: userAId,
        question_text: "Tell me about yourself",
        interview_stage: "recruiter",
        company_name_normalized: "rls test co",
      }).select("id").single();
      if (q) trackForCleanup("interview_questions_reported", q.id);

      // Both users should be able to read
      const { data: resultA } = await clientA.from("interview_questions_reported").select("question_text").eq("id", q!.id).single();
      expect(resultA?.question_text).toBe("Tell me about yourself");

      const { data: resultB } = await clientB.from("interview_questions_reported").select("question_text").eq("id", q!.id).single();
      expect(resultB?.question_text).toBe("Tell me about yourself");
    });

    it("Authenticated user CANNOT insert questions", async () => {
      const { error } = await clientA.from("interview_questions_reported").insert({
        question_text: "Unauthorized",
        interview_stage: "recruiter",
        company_name_normalized: "test",
      });
      expect(error).not.toBeNull();
    });

    it("Unauthenticated CANNOT access questions", async () => {
      const anon = createClient(supabaseUrl, anonKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { data } = await anon.from("interview_questions_reported").select("*").limit(1);
      expect(data?.length ?? 0).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPANY_PLAYBOOKS
  // Policy: authenticated read, service_role all
  // ═══════════════════════════════════════════════════════════════════════════

  describe("company_playbooks", () => {
    let playbookId: string;

    beforeAll(async () => {
      const { data } = await admin.from("company_playbooks").insert({
        company_name_normalized: `rls-test-${Date.now()}`,
        company_display_name: "RLS Test Playbook Co",
      }).select("id").single();
      playbookId = data!.id;
      trackForCleanup("company_playbooks", playbookId);
    });

    it("Authenticated user can read playbooks", async () => {
      const { data } = await clientA.from("company_playbooks").select("*").eq("id", playbookId).single();
      expect(data?.id).toBe(playbookId);
    });

    it("Authenticated user CANNOT insert playbooks", async () => {
      const { error } = await clientA.from("company_playbooks").insert({
        company_name_normalized: "unauthorized",
        company_display_name: "Hack",
      });
      expect(error).not.toBeNull();
    });

    it("Authenticated user CANNOT update playbooks", async () => {
      const { data } = await clientA
        .from("company_playbooks")
        .update({ company_display_name: "Hacked" })
        .eq("id", playbookId)
        .select();
      expect(data?.length ?? 0).toBe(0);
    });

    it("Unauthenticated CANNOT access playbooks", async () => {
      const anon = createClient(supabaseUrl, anonKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { data } = await anon.from("company_playbooks").select("*").limit(1);
      expect(data?.length ?? 0).toBe(0);
    });
  });
});
