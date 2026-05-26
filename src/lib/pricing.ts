// src/lib/pricing.ts
// ══════════════════════════════════════════════════════════════════════════════
//  مرجع الأسعار الوحيد في التطبيق — عدّل هنا بس ويتحدث في كل مكان
// ══════════════════════════════════════════════════════════════════════════════

import { Bot, Store, Brain } from "lucide-react";

// ─── باقات الاشتراك ──────────────────────────────────────────────────────────
export const SUBSCRIPTION_PLANS = {
  starter: {
    slug:       "starter",
    name:       "Starter",
    tagline:    "للمشاريع الناشئة",
    monthly:    249,          // ← السعر الشهري بالجنيه
    icon:       Bot,
    color:      "text-gray-700",
    features:   [
      "٢٬٠٠٠ جهة اتصال",
      "٢ مستخدمين",
      "Chatbot بردود ثابتة",
      "٥٠ حملة شهرياً",
    ],
  },
  professional: {
    slug:       "professional",
    name:       "Professional",
    tagline:    "للمتاجر والشركات الجادة",
    monthly:    499,          // ← السعر الشهري بالجنيه
    icon:       Store,
    color:      "text-[#25D366]",
    features:   [
      "٢٠٬٠٠٠ جهة اتصال",
      "٥ مستخدمين",
      "ربط متجر + أتمتة",
      "حملات غير محدودة",
    ],
  },
  enterprise: {
    slug:       "enterprise",
    name:       "Enterprise",
    tagline:    "للشركات الكبيرة",
    monthly:    999,          // ← السعر الشهري بالجنيه (عدّله هنا فقط)
    icon:       Brain,
    color:      "text-purple-600",
    features:   [
      "جهات اتصال غير محدودة",
      "مستخدمون غير محدودون",
      "AI Sales Assistant (1M توكن/شهر)",
      "قاعدة بيانات مخصصة",
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

// ─── باقات التوكن الإضافية ────────────────────────────────────────────────────
export const TOKEN_PACKAGES = [
  {
    id:          "pack_500k",
    label:       "+500K توكن",
    labelEn:     "+500K Tokens",
    tokens:      500_000,
    priceEGP:    99,           // ← عدّل هنا
    description: "مناسب للاستخدام المتوسط",
  },
  {
    id:          "pack_1m",
    label:       "+1M توكن",
    labelEn:     "+1M Tokens",
    tokens:      1_000_000,
    priceEGP:    149,          // ← عدّل هنا
    description: "الأفضل قيمة",
    popular:     true,
  },
  {
    id:          "pack_2m",
    label:       "+2M توكن",
    labelEn:     "+2M Tokens",
    tokens:      2_000_000,
    priceEGP:    199,          // ← عدّل هنا
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