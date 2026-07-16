import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { encryptToken, decryptToken, isEncrypted } from "@/lib/crypto";

describe("Crypto Module", () => {
  const VALID_KEY = "a".repeat(64); // 64 hex chars = 32 bytes

  beforeEach(() => {
    vi.stubEnv("ENCRYPTION_KEY", VALID_KEY);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("encryptToken & decryptToken", () => {
    it("تشفير وفك تشفير نص عادي (Round-trip)", () => {
      const plainText = "my-secret-access-token";
      const encrypted = encryptToken(plainText);
      
      expect(encrypted).not.toBe(plainText);
      expect(isEncrypted(encrypted)).toBe(true);
      
      const decrypted = decryptToken(encrypted);
      expect(decrypted).toBe(plainText);
    });

    it("تشفير وفك تشفير نصوص عربي، إيموجي، ونص فاضي", () => {
      const cases = [
        "نص عربي للتجربة",
        "Hello 🌍 emoji",
        "",
      ];

      for (const text of cases) {
        const encrypted = encryptToken(text);
        const decrypted = decryptToken(encrypted);
        expect(decrypted).toBe(text);
      }
    });

    it("كل مرة تشفّر نفس النص، الناتج مختلف (IV عشوائي)", () => {
      const plainText = "same-text";
      const encrypted1 = encryptToken(plainText);
      const encrypted2 = encryptToken(plainText);

      expect(encrypted1).not.toBe(encrypted2);
      
      // لكن فك التشفير يرجع نفس النص
      expect(decryptToken(encrypted1)).toBe(plainText);
      expect(decryptToken(encrypted2)).toBe(plainText);
    });

    it("decryptToken على نص قديم plain (من غير :) يرجعه زي ما هو", () => {
      const oldToken = "old-plain-text-token";
      
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      
      const decrypted = decryptToken(oldToken);
      expect(decrypted).toBe(oldToken);
      
      // المفروض يطبع تحذير
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it("decryptToken على نص متلاعب فيه يرمي error واضح", () => {
      const plainText = "secret-text";
      const encrypted = encryptToken(plainText);
      
      // الفورمات: iv:authTag:ciphertext
      const parts = encrypted.split(":");
      
      // التلاعب في الـ authTag
      const tamperedAuthTag = parts[0] + ":badTag:" + parts[2];
      expect(() => decryptToken(tamperedAuthTag)).toThrow(/فشل فك تشفير الـ access token/);
      
      // التلاعب في الـ ciphertext
      const tamperedCipher = parts[0] + ":" + parts[1] + ":badCipher";
      expect(() => decryptToken(tamperedCipher)).toThrow(/فشل فك تشفير الـ access token/);
    });
    
    it("isEncrypted بترجع true/false صح", () => {
      expect(isEncrypted("iv:auth:cipher")).toBe(true);
      expect(isEncrypted("plain-text")).toBe(false);
      expect(isEncrypted("only:one-colon")).toBe(false);
      expect(isEncrypted("too:many:colons:here")).toBe(false);
    });
  });

  describe("التحقق من الـ ENCRYPTION_KEY", () => {
    it("ENCRYPTION_KEY مش موجودة في الـ env يرمي error", () => {
      vi.unstubAllEnvs(); // إزالة المفتاح
      
      expect(() => encryptToken("text")).toThrow(/ENCRYPTION_KEY مش موجودة في .env/);
    });

    it("ENCRYPTION_KEY طولها غلط يرمي error", () => {
      vi.stubEnv("ENCRYPTION_KEY", "short-key");
      
      expect(() => encryptToken("text")).toThrow(/ENCRYPTION_KEY لازم تكون 64 hex chars/);
    });
  });
});
