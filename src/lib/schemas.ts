/**
 * src/lib/schemas.ts
 *
 * ─── Zod Validation Schemas (مركزية) ────────────────────────────────────────
 * كل الـ inputs للـ API routes بتتتحقق منها هنا.
 * استخدم parseInput() في كل route عشان ترجع 400 موحّد تلقائياً.
 */

import { z } from "zod";
import {
  TriggerType, ReplyType, UserRole, PlanTier,
} from "@/types/enums";

// ─── Utility helper ──────────────────────────────────────────────────────────

/**
 * يعمل safeParse ويرجع:
 *   { ok: true,  data }   — لو النتيجة صحيحة
 *   { ok: false, error }  — لو فيه validation error (جاهز يتبعت كـ 400)
 */
export function parseInput<T>(
  schema: z.ZodSchema<T>,
  input: unknown,
): { ok: true; data: T } | { ok: false; error: string } {
  const result = schema.safeParse(input);
  if (result.success) return { ok: true, data: result.data };

  // نجمّع أول خطأ بشكل مقروء — Zod v4 يستخدم .issues
  const issues = (result.error as any).issues ?? [];
  const first  = issues[0] ?? { path: [], message: result.error.message };
  const field  = first.path?.length ? first.path.join(".") : null;
  const message = field ? `${field}: ${first.message}` : first.message;
  return { ok: false, error: message };
}

// ─── Shared primitives ───────────────────────────────────────────────────────

const nonEmptyStr = z.string().trim().min(1);

const emailField = z.string().trim().toLowerCase().email("بريد إلكتروني غير صالح");

const passwordField = z
  .string()
  .min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل");

const phoneField = z
  .string()
  .trim()
  .min(1, "رقم الهاتف مطلوب");

// ─── Auth ────────────────────────────────────────────────────────────────────

/** POST /api/register */
export const RegisterSchema = z.object({
  email:    emailField,
  password: passwordField,
  name:     nonEmptyStr.max(100, "الاسم طويل جداً"),
  phone:    phoneField,
});
export type RegisterInput = z.infer<typeof RegisterSchema>;

/** POST /api/auth/forgot-password */
export const ForgotPasswordSchema = z.object({
  email: emailField,
});
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;

/** POST /api/auth/reset-password */
export const ResetPasswordSchema = z.object({
  token:    nonEmptyStr,
  password: passwordField,
});
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;

/** POST /api/auth/join-team */
export const JoinTeamSchema = z.object({
  inviteCode: nonEmptyStr,
  password:   passwordField,
  name:       nonEmptyStr.max(100).optional(),
});
export type JoinTeamInput = z.infer<typeof JoinTeamSchema>;

// ─── Onboarding ──────────────────────────────────────────────────────────────

/** POST /api/onboarding */
export const OnboardingSchema = z.object({
  phone: z
    .string()
    .trim()
    .regex(/^2\d{11}$/, "رقم هاتف غير صحيح (يجب أن يبدأ بـ 2 ويكون 12 رقماً)"),
});
export type OnboardingInput = z.infer<typeof OnboardingSchema>;

// ─── Me / Settings ───────────────────────────────────────────────────────────

const VALID_TONES = ["friendly", "formal", "egyptian"] as const;

/** PATCH /api/me/settings — type: "profile" */
export const SettingsProfileSchema = z.object({
  type:  z.literal("profile"),
  name:  nonEmptyStr.max(100, "الاسم طويل جداً"),
  phone: z.string().trim().optional(),
});
export type SettingsProfileInput = z.infer<typeof SettingsProfileSchema>;

/** PATCH /api/me/settings — type: "password" */
export const SettingsPasswordSchema = z.object({
  type:            z.literal("password"),
  currentPassword: nonEmptyStr,
  newPassword:     passwordField,
});
export type SettingsPasswordInput = z.infer<typeof SettingsPasswordSchema>;

/** PATCH /api/me/settings — type: "create_password" */
export const SettingsCreatePasswordSchema = z.object({
  type:        z.literal("create_password"),
  newPassword: passwordField,
});
export type SettingsCreatePasswordInput = z.infer<typeof SettingsCreatePasswordSchema>;

/** PATCH /api/me/settings — type: "whatsapp" */
export const SettingsWhatsAppSchema = z.object({
  type:          z.literal("whatsapp"),
  accessToken:   nonEmptyStr,
  phoneNumberId: nonEmptyStr,
  wabaId:        nonEmptyStr,
});
export type SettingsWhatsAppInput = z.infer<typeof SettingsWhatsAppSchema>;

/** PATCH /api/me/settings — type: "brand" */
export const SettingsBrandSchema = z.object({
  type:         z.literal("brand"),
  brandName:    z.string().trim().max(100).optional(),
  businessDesc: nonEmptyStr.max(2000, "الوصف طويل جداً"),
  productsInfo: z.string().trim().max(3000).optional(),
  pricingInfo:  z.string().trim().max(2000).optional(),
  workingHours: z.string().trim().max(500).optional(),
  aiTone:       z.enum(VALID_TONES).optional().default("friendly"),
});
export type SettingsBrandInput = z.infer<typeof SettingsBrandSchema>;

/** PATCH /api/me/settings — discriminated union */
export const SettingsPatchSchema = z.discriminatedUnion("type", [
  SettingsProfileSchema,
  SettingsPasswordSchema,
  SettingsCreatePasswordSchema,
  SettingsWhatsAppSchema,
  SettingsBrandSchema,
]);
export type SettingsPatchInput = z.infer<typeof SettingsPatchSchema>;

// ─── Team ────────────────────────────────────────────────────────────────────

/** POST /api/team */
export const TeamInviteSchema = z.object({
  email: emailField,
  name:  z.string().trim().max(100).optional(),
  role:  z.enum([UserRole.FULL_ACCESS, UserRole.CHAT_ONLY]),
});
export type TeamInviteInput = z.infer<typeof TeamInviteSchema>;

// ─── Automation ──────────────────────────────────────────────────────────────

const triggerValues = Object.values(TriggerType) as [string, ...string[]];
const replyValues   = Object.values(ReplyType)   as [string, ...string[]];

/** POST /api/automation */
export const AutomationCreateSchema = z
  .object({
    name:              nonEmptyStr.max(200),
    triggerType:       z.enum(triggerValues as [TriggerType, ...TriggerType[]]),
    triggerValue:      z.string().trim().optional(),
    replyType:         z.enum(replyValues as [ReplyType, ...ReplyType[]]),
    replyContent:      z.string().trim().optional(),
    templateId:        z.string().optional(),
    extraInstructions: z.string().trim().max(1000).optional(),
    humanKeywords:     z.array(z.string().trim()).optional().default([]),
    pauseOnReply:      z.boolean().optional().default(true),
    replyMediaUrl:     z.string().url().optional().or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    if (data.triggerType === TriggerType.KEYWORD && !data.triggerValue) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["triggerValue"],
        message: "الكلمة المفتاحية مطلوبة",
      });
    }
    if (data.triggerType === TriggerType.NO_REPLY) {
      const days = Number(data.triggerValue);
      if (!days || days < 1 || days > 365) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["triggerValue"],
          message: "عدد الأيام يجب أن يكون بين 1 و 365",
        });
      }
    }
    if (data.replyType === ReplyType.TEXT && !data.replyContent) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["replyContent"],
        message: "نص الرد مطلوب",
      });
    }
    if (data.replyType === ReplyType.TEMPLATE && !data.templateId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["templateId"],
        message: "اختر قالباً",
      });
    }
  });
export type AutomationCreateInput = z.infer<typeof AutomationCreateSchema>;

/** PATCH /api/automation */
export const AutomationPatchSchema = z.object({
  id: nonEmptyStr,
}).passthrough(); // باقي الفيلدز اختياري في التعديل الجزئي

/** DELETE /api/automation */
export const AutomationDeleteSchema = z.object({ id: nonEmptyStr });

// ─── Admin — Users ───────────────────────────────────────────────────────────

/** POST /api/admin/users */
export const AdminCreateUserSchema = z.object({
  name:     z.string().trim().max(100).optional(),
  email:    emailField,
  password: passwordField,
  plan:     z.enum(Object.values(PlanTier) as [string, ...string[]]),
});
export type AdminCreateUserInput = z.infer<typeof AdminCreateUserSchema>;

// ─── Admin — Coupons ─────────────────────────────────────────────────────────

/** POST /api/admin/coupons */
export const AdminCreateCouponSchema = z
  .object({
    prefix:        z.string().trim().toUpperCase().max(8).optional().default("SAVE"),
    discountType:  z.enum(["percent", "fixed"]).optional().default("percent"),
    discountValue: z.number().positive("قيمة الخصم مطلوبة"),
    maxUses:       z.number().int().min(1).optional().default(1),
    expiresAt:     z.string().datetime({ offset: true }).nullable().optional().transform(v => v ?? undefined),
    forPlan:       z.enum(["starter", "pro", "enterprise"]).nullable().optional().default(null),
  })
  .refine(
    (d) => !(d.discountType === "percent" && d.discountValue > 100),
    { message: "نسبة الخصم لا تتجاوز 100%", path: ["discountValue"] }
  );
export type AdminCreateCouponInput = z.infer<typeof AdminCreateCouponSchema>;

// ─── Admin — Articles ────────────────────────────────────────────────────────

/** POST /api/admin/articles */
export const AdminCreateArticleSchema = z.object({
  title:       nonEmptyStr.max(300),
  content:     nonEmptyStr,
  excerpt:     z.string().trim().max(500).optional(),
  coverImage:  z.string().url("رابط الصورة غير صالح").optional().or(z.literal("")),
  published:   z.boolean().optional().default(false),
  slug:        z.string().trim().max(80).optional(),
});
export type AdminCreateArticleInput = z.infer<typeof AdminCreateArticleSchema>;

// ─── Admin — Testimonials ────────────────────────────────────────────────────

/** PATCH /api/admin/testimonials */
export const AdminTestimonialPatchSchema = z.object({
  id:     nonEmptyStr,
  action: z.enum(["approve", "reject"]),
});
export type AdminTestimonialPatchInput = z.infer<typeof AdminTestimonialPatchSchema>;