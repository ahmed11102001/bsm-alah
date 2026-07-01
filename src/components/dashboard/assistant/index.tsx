"use client";

import { useState, useEffect, useCallback } from "react";
import WelcomeBanner from "./WelcomeBanner";
import RuleBanner     from "./RuleBanner";
import FloatingHelper from "./FloatingHelper";
import OnboardingTour from "@/components/dashboard/OnboardingTour";
import {
  ASSISTANT_RULES, evaluateRules,
  type AssistantRule, type RuleContext, type PageId,
} from "@/lib/assistant-rules";

interface Props {
  userId:        string;
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
  onboardingCompleted: boolean;
}

const DISMISSED_KEY = (uid: string) => `wp_assistant_dismissed_${uid}`;

export default function DashboardAssistant({
  userId, locale, activeSection,
  whatsappConnected, totalContacts, deliveryRate, planStatus, planName,
  onNavigate, helperMountId, helperOpen, onHelperOpenChange,
  onboardingCompleted,
}: Props) {
  const [showWelcome,  setShowWelcome]  = useState(false);
  const [showTour,     setShowTour]     = useState(false);
  const [dismissed,    setDismissed]    = useState<Record<string, number>>({});
  const [assistCtx,    setAssistCtx]    = useState<Partial<RuleContext>>({});
  const [activeRules,  setActiveRules]  = useState<AssistantRule[]>([]);

  // ── تحميل الـ dismissed state من localStorage ────────────────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DISMISSED_KEY(userId));
      if (raw) setDismissed(JSON.parse(raw));
    } catch { /* ignore */ }

    // هل نعرض الـ welcome banner؟ فقط لو ما كملش الـ onboarding
    if (!onboardingCompleted) {
      setShowWelcome(true);
    }
  }, [userId, onboardingCompleted]);

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
  }, [activeSection]); // نعيد الجلب لما يغير الصفحة

  // ── بناء الـ context الكامل ─────────────────────────────────────────────
  const ctx: RuleContext = {
    whatsappConnected,
    totalContacts,
    deliveryRate,
    planStatus,
    planName,
    expiredChats:         assistCtx.expiredChats        ?? 0,
    automationCount:      assistCtx.automationCount     ?? 0,
    lastCampaignStatus:   assistCtx.lastCampaignStatus,
    lastCampaignDelivery: assistCtx.lastCampaignDelivery,
  };

  // ── تقييم الـ rules لما يتغير context أو صفحة ──────────────────────────
  useEffect(() => {
    const page    = activeSection as PageId;
    const active  = evaluateRules(ASSISTANT_RULES, ctx, page, dismissed);
    // critical أول، بعدين warning، بعدين info
    active.sort((a, b) => {
      const order = { critical: 0, warning: 1, info: 2 };
      return order[a.severity] - order[b.severity];
    });
    setActiveRules(active);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection, dismissed, assistCtx, whatsappConnected, totalContacts, deliveryRate]);

  // ── Dismiss rule ────────────────────────────────────────────────────────
  const handleDismiss = useCallback((id: string) => {
    const updated = { ...dismissed, [id]: Date.now() };
    setDismissed(updated);
    try { localStorage.setItem(DISMISSED_KEY(userId), JSON.stringify(updated)); } catch { /* ignore */ }
  }, [dismissed, userId]);

  // ── Action handler ──────────────────────────────────────────────────────
  const handleAction = useCallback((target: string, type: "navigate" | "link") => {
    if (type === "link") { window.open(target, "_blank"); return; }
    onNavigate(target);
  }, [onNavigate]);

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
      {showTour && (
        <OnboardingTour
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
