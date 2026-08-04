"use client";

// ─────────────────────────────────────────────────────────────────────────
// نسخة الديمو من src/lib/dashboard-context.tsx
// نفس الـ interface بالظبط (DashboardData / SubscriptionContextValue) عشان
// كل صفحات الداشبورد المنسوخة تشتغل من غير ما نلمس منطقها الداخلي.
// الفرق الوحيد: مفيش fetch("/api/dashboard") — البيانات جاهزة في مصفوفة ثابتة.
// ─────────────────────────────────────────────────────────────────────────

import { createContext, useCallback, useContext, useState } from "react";
import { planAtLeast, type PlanTier } from "@/lib/plans";
import { DEMO_DASHBOARD_DATA } from "./demo-data";

export interface DashboardData {
  user: {
    id: string; name: string | null; email: string; phone: string | null;
    role: string; hasPassword?: boolean; hasTestimonial?: boolean;
    onboardingCompleted?: boolean;
  };
  whatsapp: { phoneNumberId: string; wabaId: string } | null;
  stats: {
    totalSent: number; totalDelivered: number; totalRead: number;
    totalInbound: number; totalCampaigns: number; totalContacts: number;
    deliveryRate: number; readRate: number; replyRate: number;
  };
  plan: {
    plan: string; planName: string; status: string;
    limits: {
      contacts: number; teamMembers: number; campaignsPerMonth: number;
      aiTokensPerMonth: number;
      scheduledCampaigns: boolean; advancedReports: boolean;
      apiAccess: boolean; mediaMessages: boolean; customAudiences: boolean;
      storeIntegration: boolean; aiAgent: boolean;
    };
    usage: { contacts: number; teamMembers: number; campaignsThisMonth: number };
  };
  recentCampaigns: {
    id: string; name: string; status: string;
    sentCount: number; deliveredCount: number; readCount: number;
    failedCount: number; createdAt: string;
    template: { name: string } | null;
  }[];
}

interface SubscriptionContextValue {
  dashData: DashboardData | null;
  loadingDash: boolean;
  refreshDash: () => Promise<void>;

  planTier: string;
  hasMetaConnection: boolean;
  canTeam: boolean;
  teamAtMax: boolean;
  campaignAtMax: boolean;
  canStore: boolean;
  canAI: boolean;
  canUseClaude: boolean;
  isSuper: boolean;
}

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  // مفيش fetch — البيانات جاهزة فورًا، مفيش حالة loading حقيقية
  const [dashData] = useState<DashboardData>(DEMO_DASHBOARD_DATA);
  const [loadingDash] = useState(false);

  // في الداشبورد الحقيقي refreshDash بيعمل fetch جديد. هنا مفيش حاجة تتغير
  // فعليًا (البيانات وهمية وثابتة)، فبنسيبها async no-op عشان أي كود بينادي
  // await refreshDash() يفضل شغال زي ما هو من غير تعديل.
  const refreshDash = useCallback(async () => {}, []);

  const planLimits = dashData.plan.limits;
  const teamLimit = planLimits.teamMembers;
  const teamUsed = dashData.plan.usage.teamMembers;
  const canTeam = teamLimit === -1 || (teamLimit > 1 && teamUsed < teamLimit);
  const teamAtMax = teamLimit !== -1 && teamLimit > 1 && teamUsed >= teamLimit;

  const campaignLimit = planLimits.campaignsPerMonth;
  const campaignUsed = dashData.plan.usage.campaignsThisMonth;
  const campaignAtMax = campaignLimit !== -1 && campaignUsed >= campaignLimit;

  const planTier = dashData.plan.plan;

  const value: SubscriptionContextValue = {
    dashData,
    loadingDash,
    refreshDash,
    planTier,
    hasMetaConnection: !!dashData.whatsapp?.phoneNumberId && !!dashData.whatsapp?.wabaId,
    canTeam,
    teamAtMax,
    campaignAtMax,
    canStore: planLimits.storeIntegration,
    canAI: planLimits.aiAgent,
    canUseClaude: planAtLeast(planTier as PlanTier, "pro"),
    isSuper: false,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) {
    throw new Error("useSubscription لازم يتستخدم جوه SubscriptionProvider (دلوقتي متوفر في app/demo/layout.tsx)");
  }
  return ctx;
}