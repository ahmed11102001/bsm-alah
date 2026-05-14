// src/lib/plans.ts
// ─── ثوابت الباقات — المرجع الوحيد لكل حدود النظام ──────────────────────────
// أي تعديل في الحدود يتم هنا فقط، وكل الكود بيقرأ منه.

export type PlanTier = "free" | "starter" | "pro" | "enterprise" | "beta";

// ─── حدود كل باقة ─────────────────────────────────────────────────────────────
export interface PlanLimits {
  contacts:            number;   // -1 = غير محدود
  teamMembers:         number;   // -1 = غير محدود
  campaignsPerMonth:   number;   // -1 = غير محدود
  // مميزات boolean
  scheduledCampaigns:  boolean;
  advancedReports:     boolean;
  apiAccess:           boolean;
  mediaMessages:       boolean;  // صور / فيديو / ملفات / صوت
  customAudiences:     boolean;
  storeIntegration:    boolean;  // ربط Shopify / EasyOrders + أتمتة المتجر
  aiAgent:             boolean;  // AI Sales Assistant — enterprise فقط
}

export const PLANS: Record<PlanTier, PlanLimits> = {
  free: {
    contacts:           100,
    teamMembers:        1,
    campaignsPerMonth:  3,
    scheduledCampaigns: false,
    advancedReports:    false,
    apiAccess:          false,
    mediaMessages:      false,
    customAudiences:    false,
    storeIntegration:   false,
    aiAgent:            false,
  },
  starter: {
    contacts:           2_000,
    teamMembers:        2,
    campaignsPerMonth:  50,
    scheduledCampaigns: true,
    advancedReports:    false,
    apiAccess:          false,
    mediaMessages:      true,
    customAudiences:    true,
    storeIntegration:   false,
    aiAgent:            false,
  },
  pro: {
    contacts:           20_000,   // ← مزامنة مع صفحة الأسعار
    teamMembers:        5,
    campaignsPerMonth:  -1,
    scheduledCampaigns: true,
    advancedReports:    true,
    apiAccess:          false,
    mediaMessages:      true,
    customAudiences:    true,
    storeIntegration:   true,
    aiAgent:            false,
  },
  enterprise: {
    contacts:           -1,
    teamMembers:        -1,
    campaignsPerMonth:  -1,
    scheduledCampaigns: true,
    advancedReports:    true,
    apiAccess:          true,
    mediaMessages:      true,
    customAudiences:    true,
    storeIntegration:   true,
    aiAgent:            true,    // ← AI Sales Assistant
  },
  beta: {
    contacts:           -1,
    teamMembers:        -1,
    campaignsPerMonth:  -1,
    scheduledCampaigns: true,
    advancedReports:    true,
    apiAccess:          true,
    mediaMessages:      true,
    customAudiences:    true,
    storeIntegration:   true,
    aiAgent:            true,
  },
} as const;

// ─── أسماء الباقات بالعربي ─────────────────────────────────────────────────────
export const PLAN_NAMES: Record<PlanTier, string> = {
  free:       "المجانية",
  starter:    "Starter",
  pro:        "Professional",
  enterprise: "Enterprise",
  beta:       "Beta ✨",
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
  apiAccess:          "enterprise",
  mediaMessages:      "starter",
  customAudiences:    "starter",
  storeIntegration:   "pro",
  aiAgent:            "enterprise",
};

// ─── ترتيب الباقات للمقارنة ───────────────────────────────────────────────────
export const PLAN_ORDER: PlanTier[] = ["free", "starter", "pro", "enterprise", "beta"];

/** هل الباقة الحالية >= الباقة المطلوبة؟ */
export function planAtLeast(current: PlanTier, required: PlanTier): boolean {
  return PLAN_ORDER.indexOf(current) >= PLAN_ORDER.indexOf(required);
}

/** هل الحد غير محدود؟ */
export function isUnlimited(n: number): boolean {
  return n === -1;
}

/** نص الحد للعرض */
export function limitLabel(n: number): string {
  return n === -1 ? "غير محدود" : n.toLocaleString("ar-EG");
}