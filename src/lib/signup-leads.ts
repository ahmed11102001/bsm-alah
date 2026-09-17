// src/lib/signup-leads.ts
// ─── تتبع التسجيلات الناقصة (اختار الإيميل ومكمّلش) ─────────────────────────
// الصف بيتعمل لحظة إصدار signupToken، وبيتحدث مع تقدم الفلو، وبيتقفل CONVERTED
// لحظة إنشاء الحساب. كرون التذكير بيبعت إيميل بعد 24 ساعة للي لسه PENDING.
// كل الدوال best-effort: الفشل هنا عمره ما يوقف فلو التسجيل نفسه.

import { createHash, randomBytes } from "crypto";
import prisma from "@/lib/prisma";
import type { Locale } from "@/lib/i18n";

export const SIGNUP_LEAD_SOURCE = {
  DASHBOARD: "DASHBOARD",
  PORTAL: "PORTAL",
} as const;
export type SignupLeadSource = (typeof SIGNUP_LEAD_SOURCE)[keyof typeof SIGNUP_LEAD_SOURCE];

export const SIGNUP_LEAD_STAGE = {
  EMAIL_PICKED: "EMAIL_PICKED",
  PHONE_ENTERED: "PHONE_ENTERED",
} as const;

export const SIGNUP_LEAD_STATUS = {
  PENDING: "PENDING",
  REMINDED: "REMINDED",
  CONVERTED: "CONVERTED",
} as const;

// صلاحية لينك الاستكمال (التوكن الأصلي بتاع Redis بيعيش 15 دقيقة بس)
export const RESUME_TOKEN_DAYS = 7;
// التذكير بيتبعت للي عدّى عليهم المدة دي ولسه مخلصوش
export const REMINDER_AFTER_HOURS = 24;
// سقف محاولات التذكير للي إيميله بيرتد
export const REMINDER_MAX_ATTEMPTS = 5;

export function newResumeToken(): string {
  return randomBytes(32).toString("hex");
}

export function hashResumeToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function normalizeLeadLocale(v: unknown): Locale {
  return v === "en" ? "en" : "ar";
}

/**
 * لحظة إصدار signupToken: سجّل الليد (أو حدّثه لو إيميل راجع).
 * بداية جديدة بعد تذكير بتصفّر حالة التذكير عشان يتبعت له تاني بعد 24 ساعة.
 */
export async function upsertSignupLead(input: {
  email: string;
  name?: string | null;
  googleSub?: string | null;
  source: SignupLeadSource;
  locale: Locale;
}): Promise<void> {
  try {
    const email = input.email.trim().toLowerCase();
    if (!email) return;
    const existing = await prisma.signupLead.findUnique({
      where: { email },
      select: { id: true, status: true },
    });
    if (!existing) {
      await prisma.signupLead.create({
        data: {
          email,
          name: input.name?.trim() || null,
          googleSub: input.googleSub || null,
          source: input.source,
          locale: input.locale,
          stage: SIGNUP_LEAD_STAGE.EMAIL_PICKED,
          status: SIGNUP_LEAD_STATUS.PENDING,
        },
      });
      return;
    }
    if (existing.status === SIGNUP_LEAD_STATUS.CONVERTED) return;
    // بداية جديدة: حدّث البيانات وصفّر التذكير (اللينك القديم بيموت)
    await prisma.signupLead.update({
      where: { email },
      data: {
        name: input.name?.trim() || null,
        googleSub: input.googleSub || undefined,
        locale: input.locale,
        stage: SIGNUP_LEAD_STAGE.EMAIL_PICKED,
        phone: null,
        status: SIGNUP_LEAD_STATUS.PENDING,
        reminderSentAt: null,
        reminderAttempts: 0,
        resumeTokenHash: null,
        resumeExpiresAt: null,
      },
    });
  } catch (err) {
    console.error("[signup-lead] upsert failed", err instanceof Error ? err.message : "unknown");
  }
}

/** خطوة الرقم: سجّل المرحلة ورقم الهاتف (best-effort). */
export async function markSignupLeadPhone(email: string, phone: string, locale?: Locale): Promise<void> {
  try {
    await prisma.signupLead.updateMany({
      where: { email: email.trim().toLowerCase(), status: { not: SIGNUP_LEAD_STATUS.CONVERTED } },
      data: {
        phone,
        stage: SIGNUP_LEAD_STAGE.PHONE_ENTERED,
        ...(locale ? { locale } : {}),
      },
    });
  } catch (err) {
    console.error("[signup-lead] stage update failed", err instanceof Error ? err.message : "unknown");
  }
}

/**
 * إصدار توكن استكمال جديد (لحظة إرسال التذكير).
 * بيرجع التوكن الخام للينك، وبيخزن الـ hash بس.
 */
export async function issueResumeToken(leadId: string): Promise<string | null> {
  try {
    const raw = newResumeToken();
    await prisma.signupLead.update({
      where: { id: leadId },
      data: {
        resumeTokenHash: hashResumeToken(raw),
        resumeExpiresAt: new Date(Date.now() + RESUME_TOKEN_DAYS * 24 * 60 * 60 * 1000),
      },
    });
    return raw;
  } catch (err) {
    console.error("[signup-lead] issue token failed", err instanceof Error ? err.message : "unknown");
    return null;
  }
}

/** لحظة إنشاء الحساب: اقفل الليد كـ CONVERTED. */
export async function markSignupLeadConverted(email: string): Promise<void> {
  try {
    await prisma.signupLead.updateMany({
      where: { email: email.trim().toLowerCase() },
      data: {
        status: SIGNUP_LEAD_STATUS.CONVERTED,
        convertedAt: new Date(),
        resumeTokenHash: null,
        resumeExpiresAt: null,
      },
    });
  } catch (err) {
    console.error("[signup-lead] convert failed", err instanceof Error ? err.message : "unknown");
  }
}
