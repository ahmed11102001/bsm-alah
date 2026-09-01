// src/lib/plans.ts
// ─── ثوابت الباقات — المرجع الوحيد لكل حدود النظام ──────────────────────────
// الباقات: Free / Go / Pro / Max (مربوطة بقاعدة البيانات عبر starter و enterprise)

export type PlanTier = "free" | "starter" | "pro" | "enterprise";
export type DisplayPlanTier = "free" | "go" | "pro" | "max";

// ─── حدود كل باقة ─────────────────────────────────────────────────────────────
export interface PlanLimits {
  contacts:            number;   // -1 = غير محدود
  teamMembers:         number;   // -1 = غير محدود
  campaignsPerMonth:   number;   // -1 = غير محدود
  aiTokensPerMonth:    number;   // -1 = غير محدود, 0 = disabled
  mcpCommandsPerMonth: number;   // -1 = غير محدود, 0 = disabled (Claude MCP)
  // مميزات boolean
  scheduledCampaigns:  boolean;
  advancedReports:     boolean;
  apiAccess:           boolean;
  mediaMessages:       boolean;  // صور / فيديو / ملفات / صوت
  customAudiences:     boolean;
  storeIntegration:    boolean;  // ربط Shopify / WooCommerce / EasyOrders + أتمتة المتجر
  aiAgent:             boolean;  // AI Sales Assistant (Wani)
}

const FREE_LIMITS: PlanLimits = {
  contacts:           100,
  teamMembers:        1,
  campaignsPerMonth:  3,
  aiTokensPerMonth:   0,
  mcpCommandsPerMonth: 0,
  scheduledCampaigns: false,
  advancedReports:    false,
  apiAccess:          false,
  mediaMessages:      false,
  customAudiences:    false,
  storeIntegration:   false,
  aiAgent:            false,
};

const GO_LIMITS: PlanLimits = {
  contacts:           2_500,
  teamMembers:        2,
  campaignsPerMonth:  50,
  aiTokensPerMonth:   0,
  mcpCommandsPerMonth: 0,
  scheduledCampaigns: true,
  advancedReports:    false,
  apiAccess:          false,
  mediaMessages:      true,
  customAudiences:    true,
  storeIntegration:   false,
  aiAgent:            false,
};

const PRO_LIMITS: PlanLimits = {
  contacts:           25_000,
  teamMembers:        5,
  campaignsPerMonth:  -1,
  aiTokensPerMonth:   0,
  mcpCommandsPerMonth: 50,
  scheduledCampaigns: true,
  advancedReports:    true,
  apiAccess:          true,
  mediaMessages:      true,
  customAudiences:    true,
  storeIntegration:   true,
  aiAgent:            false,
};

const MAX_LIMITS: PlanLimits = {
  contacts:           -1,
  teamMembers:        10,
  campaignsPerMonth:  -1,
  aiTokensPerMonth:   1_000_000,
  mcpCommandsPerMonth: -1,
  scheduledCampaigns: true,
  advancedReports:    true,
  apiAccess:          true,
  mediaMessages:      true,
  customAudiences:    true,
  storeIntegration:   true,
  aiAgent:            true,
};

export const PLANS: Record<PlanTier, PlanLimits> = {
  free:       FREE_LIMITS,
  starter:    GO_LIMITS,
  pro:        PRO_LIMITS,
  enterprise: MAX_LIMITS,
} as const;

// ─── أسماء الباقات للعرض ─────────────────────────────────────────────────────
export const PLAN_NAMES: Record<string, string> = {
  free:       "Free",
  go:         "Go",
  starter:    "Go",
  pro:        "Pro",
  max:        "Max",
  enterprise: "Max",
};

// ─── الباقة اللي بتفتح ميزة معينة ────────────────────────────────────────────
export const FEATURE_REQUIRED_PLAN: Record<keyof Pick<PlanLimits,
  | "scheduledCampaigns"
  | "advancedReports"
  | "apiAccess"
  | "mediaMessages"
  | "customAudiences"
  | "storeIntegration"
  | "aiAgent"
>, PlanTier> = {
  scheduledCampaigns: "starter",
  advancedReports:    "pro",
  apiAccess:          "pro",
  mediaMessages:      "starter",
  customAudiences:    "starter",
  storeIntegration:   "pro",
  aiAgent:            "enterprise",
};

// ─── ترتيب الباقات للمقارنة ───────────────────────────────────────────────────
export const PLAN_ORDER: PlanTier[] = ["free", "starter", "pro", "enterprise"];

/** تحويل أي slug لـ PlanTier المتوافق مع Prisma */
export function toPrismaPlanTier(plan: string): PlanTier {
  const p = plan.toLowerCase();
  if (p === "go" || p === "starter") return "starter";
  if (p === "max" || p === "enterprise") return "enterprise";
  if (p === "pro") return "pro";
  return "free";
}

/** تسلسل الرتب للمقارنة */
function planRank(tier: string): number {
  switch (tier.toLowerCase()) {
    case "free":
      return 0;
    case "go":
    case "starter":
      return 1;
    case "pro":
      return 2;
    case "max":
    case "enterprise":
      return 3;
    default:
      return 0;
  }
}

/** هل الباقة الحالية >= الباقة المطلوبة؟ */
export function planAtLeast(current: string, required: string): boolean {
  return planRank(current) >= planRank(required);
}

/** هل الحد غير محدود؟ */
export function isUnlimited(n: number): boolean {
  return n === -1;
}

/** نص الحد للعرض */
export function limitLabel(n: number): string {
  return n === -1 ? "غير محدود" : n.toLocaleString("ar-EG");
}

// ─── AI Credits Packages — re-export من pricing.ts (المرجع الوحيد للأسعار) ───
export { TOKEN_PACKAGES as AI_CREDIT_PACKAGES } from "@/lib/pricing";
export type { TokenPackageId as AiCreditPackageId } from "@/lib/pricing";
