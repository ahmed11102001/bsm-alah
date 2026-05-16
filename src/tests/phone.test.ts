// src/__tests__/phone.test.ts
import { describe, it, expect } from "vitest";
import { normalizePhone } from "@/lib/phone";

describe("normalizePhone", () => {
  // ─── حالات النجاح ────────────────────────────────────────────────────────
  describe("valid Egyptian numbers", () => {
    it("بيتعرف على رقم محلي مبدأش بـ 01", () => {
      expect(normalizePhone("01012345678")).toBe("201012345678");
    });

    it("بيتعرف على رقم دولي مع +20", () => {
      expect(normalizePhone("+201012345678")).toBe("201012345678");
    });

    it("بيتعرف على رقم دولي مع 0020", () => {
      expect(normalizePhone("00201012345678")).toBe("201012345678");
    });

    it("بيشيل المسافات البيضاء", () => {
      expect(normalizePhone("  01012345678  ")).toBe("201012345678");
    });

    it("بيشيل الشرطات والأقواس", () => {
      expect(normalizePhone("010-1234-5678")).toBe("201012345678");
    });

    it("بيتعامل مع Vodafone (010)", () => {
      expect(normalizePhone("01012345678")).toBe("201012345678");
    });

    it("بيتعامل مع Orange (012)", () => {
      expect(normalizePhone("01212345678")).toBe("201212345678");
    });

    it("بيتعامل مع Etisalat (011)", () => {
      expect(normalizePhone("01112345678")).toBe("201112345678");
    });

    it("بيتعامل مع WE (015)", () => {
      expect(normalizePhone("01512345678")).toBe("201512345678");
    });
  });

  // ─── حالات الفشل ─────────────────────────────────────────────────────────
  describe("invalid inputs — بيرجع null", () => {
    it("string فاضي", () => {
      expect(normalizePhone("")).toBeNull();
    });

    it("مسافات بس", () => {
      expect(normalizePhone("   ")).toBeNull();
    });

    it("رقم أجنبي (مش مصري)", () => {
      expect(normalizePhone("+12125551234")).toBeNull();
    });

    it("رقم ناقصة أرقام", () => {
      expect(normalizePhone("0101234")).toBeNull();
    });

    it("رقم زيادة أرقام", () => {
      expect(normalizePhone("010123456789")).toBeNull();
    });

    it("حروف بس", () => {
      expect(normalizePhone("abcdefg")).toBeNull();
    });

    it("null مش string — TypeScript بيمنعه لكن نتأكد من الـ runtime", () => {
      // @ts-expect-error — testing runtime guard
      expect(normalizePhone(null)).toBeNull();
    });

    it("رقم ببادئة غير معروفة (09)", () => {
      expect(normalizePhone("09012345678")).toBeNull();
    });
  });
});