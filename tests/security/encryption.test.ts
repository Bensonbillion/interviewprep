import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

describe("AES-256-GCM Encryption", () => {
  let encrypt: typeof import("@/lib/security/encryption").encrypt;
  let decrypt: typeof import("@/lib/security/encryption").decrypt;
  let isEncrypted: typeof import("@/lib/security/encryption").isEncrypted;
  let maybeDecrypt: typeof import("@/lib/security/encryption").maybeDecrypt;
  let encryptFields: typeof import("@/lib/security/encryption").encryptFields;
  let decryptFields: typeof import("@/lib/security/encryption").decryptFields;
  let encryptNumber: typeof import("@/lib/security/encryption").encryptNumber;
  let decryptNumber: typeof import("@/lib/security/encryption").decryptNumber;

  beforeEach(async () => {
    // Reset module to clear cached key between tests
    vi.resetModules();
    const mod = await import("@/lib/security/encryption");
    encrypt = mod.encrypt;
    decrypt = mod.decrypt;
    isEncrypted = mod.isEncrypted;
    maybeDecrypt = mod.maybeDecrypt;
    encryptFields = mod.encryptFields;
    decryptFields = mod.decryptFields;
    encryptNumber = mod.encryptNumber;
    decryptNumber = mod.decryptNumber;
  });

  // ── Core encrypt/decrypt ──────────────────────────────────────────────

  it("encrypts and decrypts a string correctly", () => {
    const plaintext = "My resume content with sensitive data";
    const encrypted = encrypt(plaintext);
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it("encrypted output is not plaintext", () => {
    const plaintext = "Sensitive salary data: $85,000";
    const encrypted = encrypt(plaintext);
    expect(encrypted).not.toContain(plaintext);
    expect(encrypted).not.toContain("85,000");
  });

  it("encrypted output has v1:iv:tag:ciphertext format (4 parts)", () => {
    const encrypted = encrypt("test");
    const parts = encrypted.split(":");
    expect(parts).toHaveLength(4);
    expect(parts[0]).toBe("v1");
    // IV, auth tag, and ciphertext are base64-encoded
    expect(parts[1].length).toBeGreaterThan(0);
    expect(parts[2].length).toBeGreaterThan(0);
    expect(parts[3].length).toBeGreaterThan(0);
  });

  it("same plaintext produces different ciphertext (random IV)", () => {
    const plaintext = "Same input each time";
    const encrypted1 = encrypt(plaintext);
    const encrypted2 = encrypt(plaintext);
    expect(encrypted1).not.toBe(encrypted2);
    // Both decrypt to same value
    expect(decrypt(encrypted1)).toBe(plaintext);
    expect(decrypt(encrypted2)).toBe(plaintext);
  });

  it("detects tampered ciphertext", () => {
    const encrypted = encrypt("test");
    const parts = encrypted.split(":");
    // Flip a character in the ciphertext portion
    const original = parts[3];
    const tampered =
      original[0] === "A"
        ? "B" + original.slice(1)
        : "A" + original.slice(1);
    const tamperedStr = `${parts[0]}:${parts[1]}:${parts[2]}:${tampered}`;
    expect(() => decrypt(tamperedStr)).toThrow();
  });

  it("detects tampered auth tag", () => {
    const encrypted = encrypt("test");
    const parts = encrypted.split(":");
    const original = parts[2];
    const tampered =
      original[0] === "A"
        ? "B" + original.slice(1)
        : "A" + original.slice(1);
    const tamperedStr = `${parts[0]}:${parts[1]}:${tampered}:${parts[3]}`;
    expect(() => decrypt(tamperedStr)).toThrow();
  });

  it("rejects invalid format (too few parts)", () => {
    expect(() => decrypt("just:two:parts")).toThrow(
      "Invalid encrypted format"
    );
  });

  it("rejects wrong key version", () => {
    const encrypted = encrypt("test");
    const withBadVersion = "v2" + encrypted.slice(2);
    expect(() => decrypt(withBadVersion)).toThrow(
      "unsupported key version"
    );
  });

  // ── Character handling ────────────────────────────────────────────────

  it("handles unicode and special characters", () => {
    const inputs = [
      "Résumé",
      "日本語テスト",
      "Emoji: \u{1F3AF}",
      '<script>alert(1)</script>',
      "Line\nbreaks\tand\ttabs",
      "Null byte: \x00",
    ];
    for (const input of inputs) {
      expect(decrypt(encrypt(input))).toBe(input);
    }
  });

  it("handles empty string", () => {
    expect(decrypt(encrypt(""))).toBe("");
  });

  it("handles very long strings (100KB)", () => {
    const long = "A".repeat(100_000);
    expect(decrypt(encrypt(long))).toBe(long);
  });

  // ── isEncrypted ───────────────────────────────────────────────────────

  it("isEncrypted correctly identifies encrypted strings", () => {
    expect(isEncrypted(encrypt("test"))).toBe(true);
  });

  it("isEncrypted rejects plain strings", () => {
    expect(isEncrypted("just plain text")).toBe(false);
    expect(isEncrypted("")).toBe(false);
    expect(isEncrypted("v2:something")).toBe(false);
  });

  // ── maybeDecrypt ──────────────────────────────────────────────────────

  it("maybeDecrypt decrypts encrypted values", () => {
    const encrypted = encrypt("secret");
    expect(maybeDecrypt(encrypted)).toBe("secret");
  });

  it("maybeDecrypt passes through plain text", () => {
    expect(maybeDecrypt("plain text")).toBe("plain text");
  });

  it("maybeDecrypt returns null for null input", () => {
    expect(maybeDecrypt(null)).toBeNull();
  });

  // ── encryptFields / decryptFields ─────────────────────────────────────

  it("encryptFields encrypts specified fields only", () => {
    const obj = {
      name: "John Doe",
      email: "john@example.com",
      notes: "Interview went well",
      score: 5,
    };
    const encrypted = encryptFields(obj, ["email", "notes"]);
    // Encrypted fields should be v1: format
    expect(isEncrypted(encrypted.email as string)).toBe(true);
    expect(isEncrypted(encrypted.notes as string)).toBe(true);
    // Non-encrypted fields should be unchanged
    expect(encrypted.name).toBe("John Doe");
    expect(encrypted.score).toBe(5);
  });

  it("decryptFields decrypts specified fields only", () => {
    const obj = {
      name: "John Doe",
      email: "john@example.com",
      notes: "Interview went well",
    };
    const encrypted = encryptFields(obj, ["email", "notes"]);
    const decrypted = decryptFields(encrypted, ["email", "notes"]);
    expect(decrypted.email).toBe("john@example.com");
    expect(decrypted.notes).toBe("Interview went well");
    expect(decrypted.name).toBe("John Doe");
  });

  it("encryptFields skips empty string fields", () => {
    const obj = { name: "John", notes: "" };
    const encrypted = encryptFields(obj, ["notes"]);
    expect(encrypted.notes).toBe("");
  });

  it("decryptFields skips non-encrypted fields", () => {
    const obj = { name: "John", notes: "plain text" };
    const decrypted = decryptFields(obj, ["notes"]);
    expect(decrypted.notes).toBe("plain text");
  });

  // ── encryptNumber / decryptNumber ─────────────────────────────────────

  it("encryptNumber encrypts and decryptNumber decrypts a number", () => {
    const encrypted = encryptNumber(85000);
    expect(isEncrypted(encrypted)).toBe(true);
    expect(decryptNumber(encrypted)).toBe(85000);
  });

  it("decryptNumber handles null", () => {
    expect(decryptNumber(null)).toBeNull();
  });

  it("decryptNumber handles plain number strings", () => {
    expect(decryptNumber("42")).toBe(42);
  });

  it("decryptNumber returns null for non-numeric encrypted values", () => {
    const encrypted = encrypt("not-a-number");
    expect(decryptNumber(encrypted)).toBeNull();
  });

  // ── Key handling ──────────────────────────────────────────────────────

  it("throws on missing DATA_ENCRYPTION_KEY", async () => {
    const origKey = process.env.DATA_ENCRYPTION_KEY;
    delete process.env.DATA_ENCRYPTION_KEY;
    try {
      // Need fresh module to clear cached key
      vi.resetModules();
      const mod = await import("@/lib/security/encryption");
      expect(() => mod.encrypt("test")).toThrow("DATA_ENCRYPTION_KEY is not set");
    } finally {
      process.env.DATA_ENCRYPTION_KEY = origKey;
    }
  });

  it("different encryption keys produce different ciphertext that cannot cross-decrypt", async () => {
    const encrypted = encrypt("secret");

    // Switch to different key
    const origKey = process.env.DATA_ENCRYPTION_KEY;
    process.env.DATA_ENCRYPTION_KEY = "different-key-for-testing-purposes-at-least-32-chars";
    vi.resetModules();
    const mod2 = await import("@/lib/security/encryption");

    // Decrypting with wrong key should throw (auth tag mismatch)
    expect(() => mod2.decrypt(encrypted)).toThrow();

    // Restore
    process.env.DATA_ENCRYPTION_KEY = origKey;
  });
});
