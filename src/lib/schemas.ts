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
import { normalizePhone } from "@/lib/phone";

// ─── Utility helper ──────────────────────────────────────────────────────────

export function parseInput<T>(
  schema: z.ZodSchema<T>,
  input: unknown,
): { ok: true; data: T } | { ok: false; error: string } {
  const result = schema.safeParse(input);
  if (result.success) return { ok: true, data: result.data };

  const issues = (result.error as any).issues ?? [];
  const first = issues[0] ?? { path: [], message: result.error.message };
  const field = first.path?.length ? first.path.join(".") : null;
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

export const RegisterSchema = z.object({
  email: emailField,
  password: passwordField,
  name: nonEmptyStr.max(100, "الاسم طويل جداً"),
  phone: phoneField,
});
export type RegisterInput = z.infer<typeof RegisterSchema>;

export const ForgotPasswordSchema = z.object({
  email: emailField,
});
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;

export const ResetPasswordSchema = z.object({
  token: nonEmptyStr,
  password: passwordField,
});
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;

export const JoinTeamSchema = z.object({
  email: emailField,
  inviteCode: nonEmptyStr,
  password: passwordField,
  name: nonEmptyStr.max(100).optional(),
});
export type JoinTeamInput = z.infer<typeof JoinTeamSchema>;

// ─── Onboarding ──────────────────────────────────────────────────────────────

/**
 * POST /api/onboarding
 *
 * Normalize and validate through the shared libphonenumber-js helper.
 * This supports valid international numbers, while still accepting
 * Egyptian local numbers such as 01012345678.
 */
export const OnboardingSchema = z.object({
  phone: z
    .string()
    .trim()
    .min(1, "رقم الهاتف مطلوب")
    .superRefine((value, ctx) => {
      if (!normalizePhone(value)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "رقم هاتف غير صحيح",
        });
      }
    })
    .transform((value) => normalizePhone(value)!),
});

export type OnboardingInput = z.infer<typeof OnboardingSchema>;

// ─── Me / Settings ───────────────────────────────────────────────────────────

const VALID_TONES = ["friendly", "formal", "egyptian"] as const;

export const SettingsProfileSchema = z.object({
  type: z.literal("profile"),
  name: nonEmptyStr.max(100, "الاسم طويل جداً"),
  phone: z.string().trim().optional(),
});
export type SettingsProfileInput = z.infer<typeof SettingsProfileSchema>;

export const SettingsPasswordSchema = z.object({
  type: z.literal("password"),
  currentPassword: nonEmptyStr,
  newPassword: passwordField,
});
export type SettingsPasswordInput = z.infer<typeof SettingsPasswordSchema>;

export const SettingsCreatePasswordSchema = z.object({
  type: z.literal("create_password"),
  newPassword: passwordField,
});
export type SettingsCreatePasswordInput = z.infer<typeof SettingsCreatePasswordSchema>;

export const SettingsWhatsAppSchema = z.object({
  type: z.literal("whatsapp"),
  accessToken: nonEmptyStr,
  phoneNumberId: nonEmptyStr,
  wabaId: nonEmptyStr,
});
export type SettingsWhatsAppInput = z.infer<typeof SettingsWhatsAppSchema>;

export const SettingsBrandSchema = z.object({
  type: z.literal("brand"),
  brandName: z.string().trim().max(100).optional(),
  businessDesc: nonEmptyStr.max(2000, "الوصف طويل جداً"),
  productsInfo: z.string().trim().max(3000).optional(),
  pricingInfo: z.string().trim().max(2000).optional(),
  workingHours: z.string().trim().max(500).optional(),
  aiTone: z.enum(VALID_TONES).optional().default("friendly"),
});
export type SettingsBrandInput = z.infer<typeof SettingsBrandSchema>;

export const SettingsPatchSchema = z.discriminatedUnion("type", [
  SettingsProfileSchema,
  SettingsPasswordSchema,
  SettingsCreatePasswordSchema,
  SettingsWhatsAppSchema,
  SettingsBrandSchema,
]);
export type SettingsPatchInput = z.infer<typeof SettingsPatchSchema>;

// ─── Team ────────────────────────────────────────────────────────────────────

export const TeamInviteSchema = z.object({
  email: emailField,
  name: z.string().trim().max(100).optional().nullable(),
  role: z.enum([UserRole.FULL_ACCESS, UserRole.CHAT_ONLY]),
});
export type TeamInviteInput = z.infer<typeof TeamInviteSchema>;

export const TeamRoleUpdateSchema = z.object({
  id: z.string().min(1),
  role: z.enum([UserRole.FULL_ACCESS, UserRole.CHAT_ONLY]),
});
export type TeamRoleUpdateInput = z.infer<typeof TeamRoleUpdateSchema>;

export const TeamResendInviteSchema = z.object({
  invitationId: nonEmptyStr,
});
export type TeamResendInviteInput = z.infer<typeof TeamResendInviteSchema>;

export const TeamCancelInviteSchema = z.object({
  invitationId: nonEmptyStr,
});
export type TeamCancelInviteInput = z.infer<typeof TeamCancelInviteSchema>;

// ─── Automation ──────────────────────────────────────────────────────────────

const triggerValues = Object.values(TriggerType) as [string, ...string[]];
const replyValues = Object.values(ReplyType) as [string, ...string[]];

const InteractiveButtonSchema = z.object({
  buttonId: z.string().trim().min(1).max(100),
  text: z.string().trim().min(1).max(20),
  nextStepId: z.string().trim().min(1).max(100).nullable().optional(),
  notifyOnSelect: z.boolean().optional().default(false),
});

export const InteractiveMenuConfigSchema = z.object({
  body: z.string().trim().min(1).max(1024),
  footer: z.string().trim().max(60).optional().default(""),
  buttons: z.array(InteractiveButtonSchema).min(1).max(3),
}).superRefine((data, ctx) => {
  const ids = data.buttons.map(button => button.buttonId);
  if (new Set(ids).size !== ids.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["buttons"],
      message: "buttonId values must be unique"
    });
  }
});

export const AutomationCreateSchema = z
  .object({
    name: nonEmptyStr.max(200),
    triggerType: z.enum(triggerValues as [TriggerType, ...TriggerType[]]),
    triggerValue: z.string().trim().optional().nullable(),
    replyType: z.enum(replyValues as [ReplyType, ...ReplyType[]]),
    replyContent: z.string().trim().optional().nullable(),
    templateId: z.string().optional().nullable(),
    extraInstructions: z.string().trim().max(1000).optional().nullable(),
    humanKeywords: z.array(z.string().trim()).optional().default([]),
    pauseOnReply: z.boolean().optional().default(true),
    replyMediaUrl: z.string().url().optional().or(z.literal("")).nullable(),
    interactiveConfig: InteractiveMenuConfigSchema.optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.triggerType === TriggerType.KEYWORD && !data.triggerValue) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["triggerValue"],
        message: "الكلمة المفتاحية مطلوبة",
      });
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
    if (data.replyType === ReplyType.INTERACTIVE_MENU && !data.interactiveConfig) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["interactiveConfig"],
        message: "Interactive menu configuration is required"
      });
    }
  });
export type AutomationCreateInput = z.infer<typeof AutomationCreateSchema>;

export const AutomationPatchSchema = z.object({
  id: nonEmptyStr,
}).passthrough();

export const AutomationDeleteSchema = z.object({ id: nonEmptyStr });

// ─── Admin — Users ───────────────────────────────────────────────────────────

export const AdminCreateUserSchema = z.object({
  name: z.string().trim().max(100).optional(),
  email: emailField,
  password: passwordField,
  plan: z.enum(Object.values(PlanTier) as [string, ...string[]]),
});
export type AdminCreateUserInput = z.infer<typeof AdminCreateUserSchema>;

// ─── Admin — Coupons ─────────────────────────────────────────────────────────

export const AdminCreateCouponSchema = z
  .object({
    prefix: z.string().trim().toUpperCase().max(8).optional().default("SAVE"),
    discountType: z.enum(["percent", "fixed"]).optional().default("percent"),
    discountValue: z.number().positive("قيمة الخصم مطلوبة"),
    maxUses: z.number().int().min(1).optional().default(1),
    expiresAt: z.string().datetime({ offset: true }).nullable().optional().transform(v => v ?? undefined),
    forPlan: z.enum(["starter", "pro", "enterprise"]).nullable().optional().default(null),
  })
  .refine(
    (d) => !(d.discountType === "percent" && d.discountValue > 100),
    { message: "نسبة الخصم لا تتجاوز 100%", path: ["discountValue"] }
  );
export type AdminCreateCouponInput = z.infer<typeof AdminCreateCouponSchema>;

// ─── Admin — Articles ────────────────────────────────────────────────────────

export const AdminCreateArticleSchema = z.object({
  title: nonEmptyStr.max(300),
  content: nonEmptyStr,
  excerpt: z.string().trim().max(500).optional(),
  coverImage: z.string().url("رابط الصورة غير صالح").optional().or(z.literal("")),
  published: z.boolean().optional().default(false),
  slug: z.string().trim().max(80).optional(),
});
export type AdminCreateArticleInput = z.infer<typeof AdminCreateArticleSchema>;

// ─── Admin — Testimonials ────────────────────────────────────────────────────

export const AdminTestimonialPatchSchema = z.object({
  id: nonEmptyStr,
  action: z.enum(["approve", "reject"]),
});
export type AdminTestimonialPatchInput = z.infer<typeof AdminTestimonialPatchSchema>;

// ─── WANI Partner Card ────────────────────────────────────────────────────────

const LegacyUserWaniPartnerCardSchema = z.object({
  id: z.string().trim().min(1).optional(),
  template: z.number().int().min(1).max(5).optional().default(1),
  brandName: nonEmptyStr.max(40, "اسم البراند طويل جداً"),
  title: nonEmptyStr.max(80, "العنوان طويل جداً"),
  tagline: nonEmptyStr.max(140, "الجملة طويلة جداً"),
  ctaText: nonEmptyStr.max(30, "نص الزر طويل جداً"),
  ctaLink: nonEmptyStr.max(500, "الرابط طويل جداً"),
  image: z.string().trim().url("رابط الصورة غير صالح"),
});
export const UserWaniPartnerCardSchema = LegacyUserWaniPartnerCardSchema.extend({
  brandName: z.string().trim().max(40).optional().default(""),
  title: z.string().trim().max(80).optional().default(""),
  tagline: z.string().trim().max(140).optional().default(""),
});
export type UserWaniPartnerCardInput = z.infer<typeof UserWaniPartnerCardSchema>;

export const UserWaniPartnerActiveSchema = z.object({ active: z.boolean() });

export const AdminCreateWaniPartnerCardSchema = UserWaniPartnerCardSchema;

export const AdminWaniPartnerCardPatchSchema = z.object({
  id: nonEmptyStr,
  status: z.enum(["pending", "approved", "rejected"]).optional(),
  rejectionReason: z.string().trim().max(300).optional(),
  active: z.boolean().optional(),
  order: z.number().int().optional(),
  template: z.number().int().min(1).max(5).optional(),
  brandName: nonEmptyStr.max(40).optional(),
  title: nonEmptyStr.max(80).optional(),
  tagline: nonEmptyStr.max(140).optional(),
  ctaText: nonEmptyStr.max(30).optional(),
  ctaLink: nonEmptyStr.max(500).optional(),
  image: z.string().trim().url().optional(),
});
export type AdminWaniPartnerCardPatchInput = z.infer<typeof AdminWaniPartnerCardPatchSchema>;

export const AdminWaniPartnerCardDeleteSchema = z.object({ id: nonEmptyStr });

// ─── AI Guardrails & Agent ───────────────────────────────────────────────────

export const AIGuardrailSchema = z.object({
  noInventPrices: z.boolean().optional().default(true),
  noInventProducts: z.boolean().optional().default(true),
  noMentionCompetitors: z.boolean().optional().default(true),
  noSharePersonal: z.boolean().optional().default(true),
  strictKnowledgeOnly: z.boolean().optional().default(true),
  alwaysHandoffComplaints: z.boolean().optional().default(true),
  responseStyle: z.enum(["short", "natural", "detailed"]).optional().default("natural"),
  customRules: z.string().trim().max(1000).nullable().optional(),
});
export type AIGuardrailInput = z.infer<typeof AIGuardrailSchema>;

export const AIAgentResponseSchema = z.object({
  reply: z.string().optional().nullable(),
  action: z.enum(["handoff"]).optional().nullable(),
  reason: z.string().optional().nullable(),
  priority: z.enum(["high", "normal"]).optional().nullable(),
  offTopic: z.boolean().optional(),
  product_ids: z.array(z.string()).optional(),
  expectsReply: z.boolean().optional(),
});
export type AIAgentResponseOutput = z.infer<typeof AIAgentResponseSchema>;

// ─── Protection Claims & Guarantee Audit ──────────────────────────────────────

export const AdminCreateProtectionClaimSchema = z.object({
  whatsappAccountId: nonEmptyStr,
  banDetectedAt: z.string().datetime().or(z.string().min(1)),
  customerNotes: z.string().trim().max(2000).optional(),
  adminNotes: z.string().trim().max(2000).optional(),
  evidenceFiles: z.array(z.string()).optional(),
});
export type AdminCreateProtectionClaimInput = z.infer<typeof AdminCreateProtectionClaimSchema>;

export const AdminProtectionClaimDecisionSchema = z.object({
  status: z.enum(["NEEDS_REVIEW", "ELIGIBLE", "NOT_ELIGIBLE", "PENDING_EVIDENCE"]),
  decisionReason: z.string().trim().max(2000).optional(),
  adminNotes: z.string().trim().max(2000).optional(),
  refundAmount: z.number().nonnegative().optional().nullable(),
  refundStatus: z.enum(["NONE", "APPROVED_PENDING_PROCESSING", "PROCESSED"]).optional(),
  evidenceRequested: z.string().trim().max(2000).optional(),
  confirmOverride: z.boolean().optional(),
}).refine(
  data => {
    if (data.status === "NOT_ELIGIBLE" && (!data.decisionReason || data.decisionReason.trim().length === 0)) {
      return false;
    }
    return true;
  },
  {
    message: "سبب القرار (Decision Reason) إجباري عند رفض الطلب",
    path: ["decisionReason"],
  }
);
export type AdminProtectionClaimDecisionInput = z.infer<typeof AdminProtectionClaimDecisionSchema>;

export const AdminRefundOverrideSchema = z.object({
  overrideRefund: z.number().nonnegative(),
  overrideReason: nonEmptyStr,
});
export type AdminRefundOverrideInput = z.infer<typeof AdminRefundOverrideSchema>;

export const AdminBanStatusUpdateSchema = z.object({
  banStatus: z.enum(["CUSTOMER_REPORTED", "EVIDENCE_PROVIDED", "VERIFIED", "NOT_VERIFIED"]),
});
export type AdminBanStatusUpdateInput = z.infer<typeof AdminBanStatusUpdateSchema>;

export const AdminAddEvidenceSchema = z.object({
  type: z.enum(["BAN_SCREENSHOT", "META_RESTRICTION", "OPT_IN_PROOF", "NO_EXTERNAL_PROVIDER_DECLARATION", "OTHER"]),
  url: z.string().url().optional(),
  name: z.string().trim().max(500).optional(),
  note: z.string().trim().max(2000).optional(),
});
export type AdminAddEvidenceInput = z.infer<typeof AdminAddEvidenceSchema>;

// ─── AI Agent Training ───────────────────────────────────────────────────────

export const PolicyTypeEnum = z.enum([
  "return_policy",
  "shipping_policy",
  "payment_policy",
  "warranty_policy",
  "privacy_policy",
  "custom",
]);

export const TrainingRuleExtractionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("faq"),
    question: z.string().trim().min(3, "السؤال يجب أن يكون 3 أحرف على الأقل").max(300),
    answer: z.string().trim().min(3, "الإجابة يجب أن تكون 3 أحرف على الأقل").max(2000),
    confidence: z.number().min(0).max(1),
    clarificationNeeded: z.string().trim().max(300).nullable().optional(),
  }),
  z.object({
    type: z.literal("customer_issue"),
    problem: z.string().trim().min(3, "المشكلة يجب أن تكون 3 أحرف على الأقل").max(300),
    resolution: z.string().trim().min(3, "الحل يجب أن يكون 3 أحرف على الأقل").max(2000),
    confidence: z.number().min(0).max(1),
    clarificationNeeded: z.string().trim().max(300).nullable().optional(),
  }),
  z.object({
    type: z.literal("policy"),
    title: z.string().trim().min(2, "عنوان السياسة قصير جداً").max(200),
    content: z.string().trim().min(3, "محتوى السياسة قصير جداً").max(2000),
    policyType: PolicyTypeEnum,
    existingPolicyId: z.string().nullable().optional(),
    confidence: z.number().min(0).max(1),
    clarificationNeeded: z.string().trim().max(300).nullable().optional(),
  }),
  z.object({
    type: z.literal("guardrail"),
    content: z.string().trim().min(3, "القاعدة يجب أن تكون 3 أحرف على الأقل").max(1000),
    confidence: z.number().min(0).max(1),
    clarificationNeeded: z.string().trim().max(300).nullable().optional(),
  }),
  z.object({
    type: z.literal("sales_behavior"),
    field: z.enum([
      "suggestAlternatives",
      "suggestUpsell",
      "suggestCrossSell",
      "suggestDiscounts",
      "maxSuggestedProducts",
      "goal",
    ]),
    value: z.union([z.boolean(), z.number(), z.string()]),
    confidence: z.number().min(0).max(1),
    clarificationNeeded: z.string().trim().max(300).nullable().optional(),
  }),
]);

export type TrainingRuleExtractionOutput = z.infer<typeof TrainingRuleExtractionSchema>;

export const TrainingExtractInputSchema = z.object({
  feedback: z.string().trim().min(2, "يرجى كتابة تعليق أو توجيه للتدريب"),
  contactId: z.string().min(1, "لازم تختار محادثة حقيقية"),
  messageId: z.string().min(1, "لازم تختار رسالة حقيقية من الإيجنت للتعليق عليها"),
});
export type TrainingExtractInput = z.infer<typeof TrainingExtractInputSchema>;

export const TrainingApproveInputSchema = z.object({
  overrides: z.record(z.string(), z.any()).optional(),
});
export type TrainingApproveInput = z.infer<typeof TrainingApproveInputSchema>;