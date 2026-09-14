"use client";

import { useState, useEffect, useCallback } from "react";
import WelcomeBanner from "./WelcomeBanner";
import RuleBanner     from "./RuleBanner";
import FloatingHelper from "./FloatingHelper";
import OnboardingTour from "@/components/dashboard/OnboardingTour";
import MobileOnboardingTour from "@/components/dashboard/MobileOnboardingTour";
import {
  ASSISTANT_RULES, evaluateRules,
  type AssistantRule, type RuleContext, type PageId,
} from "@/lib/assistant-rules";

interface Props {
  userId:        string;
  role:          "OWNER" | "FULL_ACCESS" | "CHAT_ONLY";
  locale:        "ar" | "en";
  activeSection: string;
  // بيانات من الداشبورد — بتتمرر من parent
  whatsappConnected: boolean;
  totalContacts:     number;
  deliveryRate:      number;
  planStatus:        string;
  planName:          string;
  onNavigate:        (section: string) => void;
  helperMountId?:    string;
  helperOpen?:       boolean;
  onHelperOpenChange?: (open: boolean) => void;
  onboardingCompleted: boolean | undefined;
}

const DISMISSED_KEY = (uid: string) => `wp_assistant_dismissed_${uid}`;

// planName المعروض ("Free"/"Go"/"Pro"/"Max") → tier داخلي للمقارنة
function planNameToTier(planName: string): string {
  const p = (planName ?? "").toLowerCase();
  if (p.includes("max") || p === "enterprise") return "enterprise";
  if (p.includes("pro") || p === "pro") return "pro";
  if (p.includes("go") || p === "starter") return "starter";
  return "free";
}

export default function DashboardAssistant({
  userId, role, locale, activeSection,
  whatsappConnected, totalContacts, deliveryRate, planStatus, planName,
  onNavigate, helperMountId, helperOpen, onHelperOpenChange,
  onboardingCompleted,
}: Props) {
  const [showWelcome,  setShowWelcome]  = useState(false);
  const [showTour,     setShowTour]     = useState(false);
  const [dismissed,    setDismissed]    = useState<Record<string, number>>({});
  const [assistCtx,    setAssistCtx]    = useState<Partial<RuleContext>>({});
  const [betaCtx,      setBetaCtx]      = useState<Partial<RuleContext>>({});
  const [activeRules,  setActiveRules]  = useState<AssistantRule[]>([]);
  const [activatingBeta, setActivatingBeta] = useState(false);
  const [isMobile,     setIsMobile]     = useState<boolean | null>(null);

  // ── تحميل الـ dismissed state من localStorage ────────────────────────────
  useEffect(() => {
    // CHAT_ONLY gets only the operational 24h conversation advice.
    // No onboarding/welcome/tour or workspace-level assistant prompts.
    if (role === "CHAT_ONLY") {
      setShowWelcome(false);
      setShowTour(false);
      return;
    }

    try {
      const raw = localStorage.getItem(DISMISSED_KEY(userId));
      if (raw) setDismissed(JSON.parse(raw));
    } catch { /* ignore */ }

    // هل نعرض الـ welcome banner؟ فقط لو ما كملش الـ onboarding
    if (onboardingCompleted === false) {
      setShowWelcome(true);
    } else if (onboardingCompleted === true) {
      setShowWelcome(false);
    }
  }, [userId, onboardingCompleted, role]);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    const update = () => setIsMobile(mq.matches);

    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // ── جلب context data من الـ assistant API ───────────────────────────────
  useEffect(() => {
    fetch("/api/assistant")
      .then(r => r.json())
      .then(data => setAssistCtx({
        expiredChats:         data.expiredChats        ?? 0,
        automationCount:      data.automationCount     ?? 0,
        lastCampaignStatus:   data.lastCampaignStatus  ?? undefined,
        lastCampaignDelivery: data.lastCampaignDelivery ?? undefined,
      }))
      .catch(() => {});
    // ── حالة Agent Beta Access (لغير Max) — تُستخدم في rules البيتا ──
    fetch("/api/agent-beta/status")
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (!data) return;
        setBetaCtx({
          agentBetaActive:    data.active ?? false,
          agentBetaConsumed:  data.consumed ?? false,
          agentBetaEligible:  data.eligible ?? false,
          agentBetaDaysLeft:  data.daysLeft ?? 0,
          agentBetaRemaining: data.remaining ?? 0,
          agentBetaReason:    data.reason ?? "inactive",
        });
      })
      .catch(() => {});
  }, [activeSection]); // نعيد الجلب لما يغير الصفحة

  // ── بناء الـ context الكامل ─────────────────────────────────────────────
  const ctx: RuleContext = {
    whatsappConnected,
    totalContacts,
    deliveryRate,
    planStatus,
    planName,
    planTier: planNameToTier(planName),
    role,
    expiredChats:         assistCtx.expiredChats        ?? 0,
    automationCount:      assistCtx.automationCount     ?? 0,
    lastCampaignStatus:   assistCtx.lastCampaignStatus,
    lastCampaignDelivery: assistCtx.lastCampaignDelivery,
    agentBetaActive:      betaCtx.agentBetaActive,
    agentBetaConsumed:    betaCtx.agentBetaConsumed,
    agentBetaEligible:    betaCtx.agentBetaEligible,
    agentBetaDaysLeft:    betaCtx.agentBetaDaysLeft,
    agentBetaRemaining:   betaCtx.agentBetaRemaining,
    agentBetaReason:      betaCtx.agentBetaReason,
  };

  // ── تقييم الـ rules لما يتغير context أو صفحة ──────────────────────────
  useEffect(() => {
    const page    = activeSection as PageId;
    const availableRules = role === "CHAT_ONLY"
      ? ASSISTANT_RULES.filter(rule => rule.id === "expired_chats_24h")
      : ASSISTANT_RULES;
    const active  = evaluateRules(availableRules, ctx, page, dismissed);
    // critical أول، بعدين warning، بعدين info
    active.sort((a, b) => {
      const order = { critical: 0, warning: 1, info: 2 };
      return order[a.severity] - order[b.severity];
    });
    setActiveRules(active);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection, dismissed, assistCtx, betaCtx, whatsappConnected, totalContacts, deliveryRate, role, planName, planStatus]);

  // ── Dismiss rule ────────────────────────────────────────────────────────
  const handleDismiss = useCallback((id: string) => {
    const updated = { ...dismissed, [id]: Date.now() };
    setDismissed(updated);
    try { localStorage.setItem(DISMISSED_KEY(userId), JSON.stringify(updated)); } catch { /* ignore */ }
  }, [dismissed, userId]);

  // ── Action handler ──────────────────────────────────────────────────────
  const handleAction = useCallback(async (target: string, type: "navigate" | "link" | "action") => {
    if (type === "link") { window.open(target, "_blank"); return; }
    if (type === "navigate") { onNavigate(target); return; }
    // ── custom actions ──
    if (target === "activate_agent_beta") {
      if (activatingBeta) return;
      setActivatingBeta(true);
      try {
        const r = await fetch("/api/agent-beta/activate", { method: "POST" });
        const data = await r.json();
        if (!r.ok) throw new Error(data?.error ?? "activation_failed");
        // حدّث حالة البيتا فوراً + حدّث الداشبورد (يفتح تاب الأتمتة)
        setBetaCtx({
          agentBetaActive: true,
          agentBetaConsumed: true,
          agentBetaEligible: false,
          agentBetaDaysLeft: 5,
          agentBetaRemaining: data?.beta?.remaining ?? 30000,
          agentBetaReason: "active",
        });
        window.dispatchEvent(new CustomEvent("refresh-dash"));
        onNavigate("automation");
      } catch (e: any) {
        const { toast } = await import("sonner");
        toast.error(e?.message ?? (locale === "ar" ? "تعذر التفعيل" : "Activation failed"));
      } finally {
        setActivatingBeta(false);
      }
      return;
    }
    onNavigate(target);
  }, [onNavigate, activatingBeta, locale]);

  // ── Start tour from welcome banner ─────────────────────────────────────
  const handleStartTour = useCallback(() => {
    setShowWelcome(false);
    // Small delay so welcome banner exit animation plays
    setTimeout(() => setShowTour(true), 350);
  }, []);

  // ── Tour completed ─────────────────────────────────────────────────────
  const handleTourComplete = useCallback(async () => {
    setShowTour(false);
    
    // إرسال تحديث للسيرفر عشان الجولة متظهرش تاني
    try {
      await fetch("/api/user/onboarding", { method: "POST" });
      window.dispatchEvent(new CustomEvent("refresh-dash"));
    } catch (err) {
      console.error("Failed to update onboarding state", err);
    }

    // Navigate back to home after tour ends
    onNavigate("home");
  }, [onNavigate]);

  // ── Banner rules (أعلى الصفحة) — أول critical بس علشان ما يكثرش ────────
  const bannerRules = activeRules
    .filter(r => r.displayAs === "banner")
    .slice(0, 2); // max 2 banners

  return (
    <>
      {/* Welcome modal — only if onboarding NOT completed */}
      {showWelcome && (
        <WelcomeBanner
          locale={locale}
          onStartTour={handleStartTour}
        />
      )}

      {/* Onboarding Tour */}
      {showTour && isMobile === false && (
        <OnboardingTour
          locale={locale}
          onNavigate={onNavigate}
          onComplete={handleTourComplete}
        />
      )}

      {showTour && isMobile === true && (
        <MobileOnboardingTour
          locale={locale}
          onNavigate={onNavigate}
          onComplete={handleTourComplete}
        />
      )}

      {/* Top banners — بيتحطوا فوق الـ content */}
      {!showTour && bannerRules.length > 0 && (
        <div className="mb-4 space-y-2">
          {bannerRules.map(rule => (
            <RuleBanner
              key={rule.id}
              rule={rule}
              ctx={ctx}
              locale={locale}
              onDismiss={handleDismiss}
              onAction={handleAction}
            />
          ))}
        </div>
      )}

      {/* Floating helper button (bottom right) — hidden during tour */}
      {!showTour && (
        <FloatingHelper
          rules={activeRules}
          ctx={ctx}
          locale={locale}
          onDismiss={handleDismiss}
          onAction={handleAction}
          mountId={helperMountId}
          isOpen={helperOpen}
          onOpenChange={onHelperOpenChange}
        />
      )}
    </>
  );
}
