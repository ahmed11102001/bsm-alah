import { describe, it, expect } from "vitest";
import { z } from "zod";
import {
  parseInput,
  RegisterSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
  JoinTeamSchema,
  OnboardingSchema,
  SettingsBrandSchema,
  AutomationCreateSchema,
} from "@/lib/schemas";
import { TriggerType, ReplyType } from "@/types/enums";

describe("Schemas Module", () => {
  describe("parseInput wrapper", () => {
    const testSchema = z.object({ name: z.string().min(3, "Too short") });

    it("مدخل صحيح → بيرجع { ok: true, data }", () => {
      const result = parseInput(testSchema, { name: "Ahmed" });
      expect(result).toEqual({ ok: true, data: { name: "Ahmed" } });
    });

    it("مدخل غلط → بيرجع { ok: false, error: '...' }", () => {
      const result = parseInput(testSchema, { name: "Ah" });
      expect(result).toEqual({ ok: false, error: "name: Too short" });
    });
  });

  describe("RegisterSchema", () => {
    it("Valid input يعدّي", () => {
      const input = { email: "test@example.com", password: "password123", name: "Ahmed", phone: "01012345678" };
      expect(RegisterSchema.safeParse(input).success).toBe(true);
    });

    it("إيميل غلط الفورمات يترفض", () => {
      const input = { email: "testexample.com", password: "password123", name: "Ahmed", phone: "01012345678" };
      expect(RegisterSchema.safeParse(input).success).toBe(false);
    });

    it("باسورد قصير جداً يترفض", () => {
      const input = { email: "test@example.com", password: "pass", name: "Ahmed", phone: "01012345678" };
      expect(RegisterSchema.safeParse(input).success).toBe(false);
    });

    it("حقول ناقصة تترفض", () => {
      const input = { email: "test@example.com" }; // missing password, name, phone
      expect(RegisterSchema.safeParse(input).success).toBe(false);
    });
  });

  describe("ForgotPasswordSchema & ResetPasswordSchema", () => {
    it("ForgotPassword: إيميل صحيح يعدي", () => {
      expect(ForgotPasswordSchema.safeParse({ email: "test@example.com" }).success).toBe(true);
    });

    it("ForgotPassword: إيميل غلط يترفض", () => {
      expect(ForgotPasswordSchema.safeParse({ email: "invalid-email" }).success).toBe(false);
    });

    it("ResetPassword: توكن وباسورد صالحين يعدوا", () => {
      expect(ResetPasswordSchema.safeParse({ token: "tok123", password: "password123" }).success).toBe(true);
    });

    it("ResetPassword: باسورد جديد ضعيف يترفض", () => {
      expect(ResetPasswordSchema.safeParse({ token: "tok123", password: "123" }).success).toBe(false);
    });
  });

  describe("JoinTeamSchema", () => {
    it("Valid input يعدي", () => {
      expect(JoinTeamSchema.safeParse({ inviteCode: "code123", password: "password123", name: "User" }).success).toBe(true);
    });

    it("inviteCode فاضي يترفض", () => {
      expect(JoinTeamSchema.safeParse({ inviteCode: "", password: "password123" }).success).toBe(false);
    });
  });

  describe("OnboardingSchema", () => {
    it("رقم صحيح (يبدأ بـ 2 و 12 رقم) يعدي", () => {
      expect(OnboardingSchema.safeParse({ phone: "201012345678" }).success).toBe(true);
    });

    it("رقم غلط (مش بيبدأ بـ 2 أو أقل من 12 رقم) يترفض", () => {
      expect(OnboardingSchema.safeParse({ phone: "01012345678" }).success).toBe(false); // مفيش مفتاح 2
      expect(OnboardingSchema.safeParse({ phone: "2010" }).success).toBe(false); // قصير
    });
  });

  describe("AutomationCreateSchema (SuperRefine Logic)", () => {
    it("لو النوع KEYWORD لازم يكون فيه triggerValue", () => {
      const input = {
        name: "Auto1",
        triggerType: TriggerType.KEYWORD,
        // triggerValue missing
        replyType: ReplyType.TEXT,
        replyContent: "Reply msg",
      };
      const result = AutomationCreateSchema.safeParse(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("الكلمة المفتاحية مطلوبة");
      }
    });

    it("لو الرد TEXT لازم يكون فيه replyContent", () => {
      const input = {
        name: "Auto1",
        triggerType: TriggerType.KEYWORD,
        triggerValue: "test", // pass first validation
        replyType: ReplyType.TEXT,
        // replyContent missing
      };
      const result = AutomationCreateSchema.safeParse(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        const hasError = result.error.issues.some(i => i.message === "نص الرد مطلوب");
        expect(hasError).toBe(true);
      }
    });
  });

  describe("SettingsBrandSchema", () => {
    it("Valid input", () => {
      expect(SettingsBrandSchema.safeParse({ type: "brand", businessDesc: "Desc" }).success).toBe(true);
    });
    
    it("Invalid input (missing required businessDesc)", () => {
      expect(SettingsBrandSchema.safeParse({ type: "brand" }).success).toBe(false);
    });
  });
});
