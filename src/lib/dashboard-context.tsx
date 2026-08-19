"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { planAtLeast, type PlanTier } from "@/lib/plans";

// ─── نفس شكل البيانات اللي كان DashboardInner بيجيبها من /api/dashboard ──────
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

    // ── مشتقات جاهزة، نفس الحسابات اللي كانت جوه DashboardInner بالظبط ─────────
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
    const { data: session } = useSession();
    const [dashData, setDashData] = useState<DashboardData | null>(null);
    const [loadingDash, setLoadingDash] = useState(true);

    const refreshDash = useCallback(async (silent = false) => {
        if (!silent) setLoadingDash(true);
        try {
            const r = await fetch("/api/dashboard");
            if (r.ok) {
                setDashData(await r.json());
            } else if (r.status === 401 || r.status === 404) {
                signOut({ callbackUrl: "/" });
            }
        } finally {
            if (!silent) setLoadingDash(false);
        }
    }, []);

    useEffect(() => { refreshDash(); }, [refreshDash]);

    // تحديث دوري صامت في الخلفية كل 20 ثانية، من غير ما يبيّن أي loading spinner
    // عشان الأرقام (رسائل مستلمة، إلخ) تتحدث لوحدها من غير ما اليوزر يعمل ريفريش
    useEffect(() => {
        const id = setInterval(() => { refreshDash(true); }, 20000);
        return () => clearInterval(id);
    }, [refreshDash]);

    // تحديث فوري لما التاب يرجع يبقى مفتوح/ظاهر (بعد ما كان في تاب تاني مثلاً)
    useEffect(() => {
        const onVisible = () => { if (document.visibilityState === "visible") refreshDash(true); };
        document.addEventListener("visibilitychange", onVisible);
        return () => document.removeEventListener("visibilitychange", onVisible);
    }, [refreshDash]);

    // نفس الحدث القديم "refresh-dash" اللي صفحات تانية بتطلقه بعد تعديل بيانات
    useEffect(() => {
        const h = () => refreshDash();
        window.addEventListener("refresh-dash", h);
        return () => window.removeEventListener("refresh-dash", h);
    }, [refreshDash]);

    const planLimits = dashData?.plan.limits;
    const teamLimit = planLimits?.teamMembers ?? 0;
    const teamUsed = dashData?.plan.usage.teamMembers ?? 0;
    const canTeam = planLimits != null && (teamLimit === -1 || (teamLimit > 1 && teamUsed < teamLimit));
    const teamAtMax = planLimits != null && teamLimit !== -1 && teamLimit > 1 && teamUsed >= teamLimit;

    const campaignLimit = planLimits?.campaignsPerMonth ?? 0;
    const campaignUsed = dashData?.plan.usage.campaignsThisMonth ?? 0;
    const campaignAtMax = planLimits != null && campaignLimit !== -1 && campaignUsed >= campaignLimit;

    const planTier = dashData?.plan.plan ?? "free";

    const value: SubscriptionContextValue = {
        dashData,
        loadingDash,
        refreshDash,
        planTier,
        hasMetaConnection: !!dashData?.whatsapp?.phoneNumberId && !!dashData?.whatsapp?.wabaId,
        canTeam,
        teamAtMax,
        campaignAtMax,
        canStore: planLimits?.storeIntegration ?? false,
        canAI: planLimits?.aiAgent ?? false,
        canUseClaude: planAtLeast(planTier as PlanTier, "pro"),
        isSuper: !!session?.user?.isSuper,
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
        throw new Error("useSubscription لازم يتستخدم جوه SubscriptionProvider (دلوقتي متوفر في dashboard/layout.tsx)");
    }
    return ctx;
}