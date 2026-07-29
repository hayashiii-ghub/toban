import { describe, it, expect } from "vitest";
import { hashToken, timingSafeEqual, verifyToken } from "./auth";

describe("hashToken", () => {
  it("returns consistent SHA-256 hex string", async () => {
    const hash1 = await hashToken("test-token");
    const hash2 = await hashToken("test-token");
    expect(hash1).toBe(hash2);
    expect(hash1).toMatch(/^[0-9a-f]{64}$/);
  });

  it("returns different hashes for different inputs", async () => {
    const hash1 = await hashToken("token-a");
    const hash2 = await hashToken("token-b");
    expect(hash1).not.toBe(hash2);
  });
});

describe("timingSafeEqual", () => {
  it("returns true for equal strings", () => {
    expect(timingSafeEqual("abc", "abc")).toBe(true);
  });

  it("returns false for different strings", () => {
    expect(timingSafeEqual("abc", "def")).toBe(false);
  });

  it("returns false for different lengths", () => {
    expect(timingSafeEqual("abc", "abcd")).toBe(false);
  });

  it("returns true for empty strings", () => {
    expect(timingSafeEqual("", "")).toBe(true);
  });
});

describe("verifyToken", () => {
  it("validates against editTokenHash when present", async () => {
    const token = "my-secret-token";
    const hash = await hashToken(token);

    const result = await verifyToken(
      { editToken: "", editTokenHash: hash },
      token
    );
    expect(result.valid).toBe(true);
    expect(result.needsMigration).toBe(false);
  });

  it("rejects wrong token against hash", async () => {
    const hash = await hashToken("correct-token");

    const result = await verifyToken(
      { editToken: "", editTokenHash: hash },
      "wrong-token"
    );
    expect(result.valid).toBe(false);
    expect(result.needsMigration).toBe(false);
  });

  it("falls back to plaintext editToken when no hash", async () => {
    const result = await verifyToken(
      { editToken: "plain-token", editTokenHash: null },
      "plain-token"
    );
    expect(result.valid).toBe(true);
    expect(result.needsMigration).toBe(true);
  });

  it("rejects wrong plaintext token", async () => {
    const result = await verifyToken(
      { editToken: "plain-token", editTokenHash: null },
      "wrong"
    );
    expect(result.valid).toBe(false);
    expect(result.needsMigration).toBe(false);
  });

  it("rejects when both editToken and editTokenHash are empty", async () => {
    const result = await verifyToken(
      { editToken: "", editTokenHash: null },
      "any-token"
    );
    expect(result.valid).toBe(false);
    expect(result.needsMigration).toBe(false);
  });
});
