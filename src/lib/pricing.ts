// src/lib/pricing.ts
// ══════════════════════════════════════════════════════════════════════════════
//  مرجع الأسعار الوحيد في التطبيق — Free / Go / Pro / Max
// ══════════════════════════════════════════════════════════════════════════════

import { Zap, Rocket, Store, Brain, Sparkles } from "lucide-react";

// ─── باقات الاشتراك ──────────────────────────────────────────────────────────
export const SUBSCRIPTION_PLANS = {
  go: {
    slug:       "go",
    name:       "Go",
    tagline:    "للمشاريع الناشئة والبدايات السريعة",
    monthly:    249,          // ← السعر الشهري بالجنيه
    icon:       Rocket,
    color:      "text-sky-600",
    features:   [
      "٢٬٥٠٠ جهة اتصال نشطة",
      "٢ مستخدمين للفريق",
      "٥٠ حملة شهرياً + ميديا كاملة",
      "شات بوت وأزرار تفاعلية",
      "تزامن واستيراد Google Sheets",
    ],
  },
  pro: {
    slug:       "pro",
    name:       "Pro",
    tagline:    "للمتاجر والشركات المتنامية والأتمتة",
    monthly:    599,          // ← السعر الشهري بالجنيه
    icon:       Store,
    color:      "text-[#25D366]",
    features:   [
      "٢٥٬٠٠٠ جهة اتصال نشطة",
      "٥ مستخدمين + تعيين تلقائي",
      "حملات غير محدودة ∞ + Smart Follow-Up",
      "ربط المتاجر (Shopify, WooCommerce, EasyOrders)",
      "استرجاع السلات المتروكة وتأكيد الطلبات",
      "مساعد Claude AI + تقارير متقدمة",
    ],
  },
  max: {
    slug:       "max",
    name:       "Max",
    tagline:    "للشركات الكبيرة مع AI متكامل",
    monthly:    999,          // ← السعر الشهري بالجنيه (عرض خاص بدلاً من 1199)
    icon:       Brain,
    color:      "text-amber-500",
    features:   [
      "جهات اتصال غير محدودة ∞",
      "١٠ مستخدمين للفريق",
      "إيجنت وني الذكي (Wani AI Sales & Support)",
      "١٬٠٠٠٬٠٠٠ توكن AI شهرياً + ElevenLabs صوتي",
      "تدريب مخصص للإيجنت Human-in-the-Loop",
      "ربط API كامل + مدير حساب ودعم VIP",
    ],
  },

  // ─── Aliases for backward compatibility ───
  starter: {
    slug:       "go",
    name:       "Go",
    tagline:    "للمشاريع الناشئة والبدايات السريعة",
    monthly:    249,
    icon:       Rocket,
    color:      "text-sky-600",
    features:   [
      "٢٬٥٠٠ جهة اتصال نشطة",
      "٢ مستخدمين للفريق",
      "٥٠ حملة شهرياً + ميديا كاملة",
      "شات بوت وأزرار تفاعلية",
      "تزامن واستيراد Google Sheets",
    ],
  },
  enterprise: {
    slug:       "max",
    name:       "Max",
    tagline:    "للشركات الكبيرة مع AI متكامل",
    monthly:    999,
    icon:       Brain,
    color:      "text-amber-500",
    features:   [
      "جهات اتصال غير محدودة ∞",
      "١٠ مستخدمين للفريق",
      "إيجنت وني الذكي (Wani AI Sales & Support)",
      "١٬٠٠٠٬٠٠٠ توكن AI شهرياً + ElevenLabs صوتي",
      "تدريب مخصص للإيجنت Human-in-the-Loop",
      "ربط API كامل + مدير حساب ودعم VIP",
    ],
  },
} as const;

export type PlanSlug = keyof typeof SUBSCRIPTION_PLANS;

// ─── دورات الفوترة ───────────────────────────────────────────────────────────
export const BILLING_CYCLES = {
  monthly:   { label: "شهري",     months: 1,  discount: 0    },
  quarterly: { label: "ربع سنوي", months: 3,  discount: 0.15 },
  annual:    { label: "سنوي",     months: 12, discount: 0.25 },
} as const;

export type BillingCycle = keyof typeof BILLING_CYCLES;

/** الخصم متاح لجميع الباقات المدفوعة: Go, Pro, Max (والمسميات السابقة starter, enterprise). */
export function canUseBillingCycle(plan: string, cycle: BillingCycle): boolean {
  if (cycle === "monthly") return true;
  const p = plan.toLowerCase();
  return p === "go" || p === "pro" || p === "max" || p === "starter" || p === "enterprise";
}

// ─── باقات التوكن الإضافية ────────────────────────────────────────────────────
export const TOKEN_PACKAGES = [
  {
    id:          "pack_500k",
    label:       "+500K توكن",
    labelEn:     "+500K Tokens",
    tokens:      500_000,
    priceEGP:    99,
    description: "مناسب للاستخدام المتوسط",
  },
  {
    id:          "pack_1m",
    label:       "+1M توكن",
    labelEn:     "+1M Tokens",
    tokens:      1_000_000,
    priceEGP:    149,
    description: "الأفضل قيمة 💎",
    popular:     true,
  },
  {
    id:          "pack_2m",
    label:       "+2M توكن",
    labelEn:     "+2M Tokens",
    tokens:      2_000_000,
    priceEGP:    199,
    description: "للاستخدام المكثف",
  },
] as const;

export type TokenPackageId = typeof TOKEN_PACKAGES[number]["id"];

// ─── باقة أوامر Claude الإضافية (غير محدودة لشهر) ────────────────────────────
export const MCP_ADDON_PACKAGES = [
  {
    id:          "mcp_addon_unlimited",
    label:       "Claude غير محدود ∞",
    labelEn:     "Unlimited Claude ∞",
    commands:    -1,           // -1 = غير محدود
    priceEGP:    99,
    description: "أوامر Claude غير محدودة لمدة شهر كامل",
  },
] as const;

export type McpAddonPackageId = typeof MCP_ADDON_PACKAGES[number]["id"];

// ─── Helpers ─────────────────────────────────────────────────────────────────
export function computePrice(monthly: number, cycle: BillingCycle): number {
  const c = BILLING_CYCLES[cycle] ?? BILLING_CYCLES.monthly;
  return Math.round(monthly * (1 - c.discount));
}
