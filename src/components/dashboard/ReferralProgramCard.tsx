// src/components/dashboard/ReferralProgramCard.tsx
"use client";

import { useState, useEffect } from "react";
import { useLanguage } from "@/lib/language-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Gift,
  Copy,
  Check,
  Users,
  Clock,
  Sparkles,
  ArrowUpRight,
  TrendingUp,
  CreditCard,
  ChevronDown,
  ChevronUp,
  Share2,
  Info,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import type { ReferralStatusResponse, ReferralHistoryItem } from "@/lib/referral/types";
import { SUBSCRIPTION_PLANS } from "@/lib/pricing";

interface ReferralProgramCardProps {
  isFreePlan: boolean;
  userPlan?: string;
  locale?: string;
}

const PROGRESSION_STEPS = Array.from({ length: 15 }, (_, previousQualifiedReferrals) => {
  const bonusPercent = Math.min(previousQualifiedReferrals * 3, 40);
  return {
    previousQualifiedReferrals,
    bonusPercent,
    labelAr:
      previousQualifiedReferrals === 0
        ? "أول عميل"
        : previousQualifiedReferrals === 1
          ? "العميل الثاني"
          : previousQualifiedReferrals === 2
            ? "العميل الثالث"
            : previousQualifiedReferrals === 3
              ? "العميل الرابع"
              : `العميل رقم ${previousQualifiedReferrals + 1}`,
  };
});

function formatPercentRange(minRate: number, maxRate: number) {
  const min = Math.round(minRate * 100);
  const max = Math.round(maxRate * 100);
  return min === max ? `${min}%` : `${min}%–${max}%`;
}

function getMotivationText(qualifiedCount: number, maxRate: number, locale: string) {
  if (maxRate >= 0.5) {
    return locale === "ar"
      ? "👑 وصلت لأقصى نسبة: 50%"
      : "👑 You reached the maximum rate: 50%";
  }

  if (qualifiedCount === 0) {
    return locale === "ar"
      ? "🔥 أول عميل يبدأ رحلتك من 10% إلى 35% حسب الباقة التي يختارها."
      : "🔥 Your first customer starts you at 10%–35%, depending on the plan they choose.";
  }

  if (qualifiedCount === 1) {
    return locale === "ar"
      ? "الإحالة القادمة ترفع نسبتك +3%."
      : "Your next paid referral raises your rate by +3%.";
  }

  return locale === "ar"
    ? `🔥 ${qualifiedCount} عملاء مدفوعين! الإحالة القادمة ترفع نسبتك +3% إضافية.`
    : `🔥 ${qualifiedCount} paid customers! Your next referral raises your rate by another +3%.`;
}

export default function ReferralProgramCard({
  isFreePlan,
  userPlan = "pro",
  locale = "ar",
}: ReferralProgramCardProps) {
  const { locale: contextLocale } = useLanguage();
  const activeLocale = locale || contextLocale || "ar";
  const [data, setData] = useState<ReferralStatusResponse | null>(null);
  const [history, setHistory] = useState<ReferralHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showProgression, setShowProgression] = useState(false);

  useEffect(() => {
    if (isFreePlan) {
      setLoading(false);
      return;
    }

    setLoading(true);
    Promise.all([
      fetch("/api/referral/status").then((res) => res.json()),
      fetch("/api/referral/history").then((res) => res.json()),
    ])
      .then(([statusData, historyData]) => {
        if (statusData?.isEligible) setData(statusData);
        if (historyData?.history) setHistory(historyData.history);
      })
      .catch((err) => {
        console.error("Failed to load referral data:", err);
      })
      .finally(() => setLoading(false));
  }, [isFreePlan]);

  const copyToClipboard = (text: string, isCode = false) => {
    if (!text) return;
    navigator.clipboard.writeText(text);

    if (isCode) {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
      toast.success(activeLocale === "ar" ? "تم نسخ كود الإحالة ✓" : "Referral code copied ✓");
    } else {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
      toast.success(activeLocale === "ar" ? "تم نسخ الرابط بنجاح ✓" : "Referral link copied ✓");
    }
  };

  if (isFreePlan) {
    return (
      <Card className="border border-purple-100 dark:border-purple-900/30 shadow-sm bg-gradient-to-br from-purple-50/50 via-white to-green-50/30 dark:from-purple-950/10 dark:to-gray-900 overflow-hidden">
        <CardContent className="p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center flex-shrink-0 shadow-md text-white">
                <Gift className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white text-base">
                  {activeLocale === "ar" ? "🎁 برنامج الإحالة للمشتركين المدفوعين" : "🎁 Referral Program for Paid Subscribers"}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed max-w-xl">
                  {activeLocale === "ar"
                    ? "رقمك المجاني غير مؤهل لبرنامج رصيد الإحالة. اشترك في Wani لتفتح رابط الإحالة الخاص بك."
                    : "Free accounts are not eligible for referral credits. Subscribe to Wani to unlock your referral link."}
                </p>
              </div>
            </div>

            <Button
              onClick={() => (window.location.href = "/checkout?plan=pro")}
              className="bg-[#25D366] hover:bg-[#20bb5a] text-white font-bold text-xs h-9 px-4 rounded-xl gap-1.5 shadow-sm flex-shrink-0 w-full sm:w-auto"
            >
              <ArrowUpRight className="w-4 h-4" />
              {activeLocale === "ar" ? "ترقية الباقة الآن" : "Upgrade Plan Now"}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="border border-gray-100 dark:border-gray-800 shadow-sm animate-pulse p-6">
        <div className="flex justify-between items-center mb-5">
          <div className="space-y-2 w-1/2">
            <div className="h-6 w-3/4 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-4 w-full bg-gray-100 dark:bg-gray-800 rounded" />
          </div>
          <div className="h-8 w-28 bg-gray-200 dark:bg-gray-700 rounded-xl" />
        </div>
        <div className="h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl mb-4" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-gray-100 dark:bg-gray-800 rounded-2xl" />
          ))}
        </div>
      </Card>
    );
  }

  if (!data) return null;

  const currentRateRange = formatPercentRange(data.minCurrentRate, data.maxCurrentRate);
  const planRows = [
    {
      key: "starter" as const,
      label: "Starter",
      price: SUBSCRIPTION_PLANS.starter.monthly,
      rate: data.ratesByPlan.starter.finalRate,
    },
    {
      key: "pro" as const,
      label: "Professional",
      price: SUBSCRIPTION_PLANS.pro.monthly,
      rate: data.ratesByPlan.pro.finalRate,
    },
    {
      key: "enterprise" as const,
      label: "Enterprise",
      price: SUBSCRIPTION_PLANS.enterprise.monthly,
      rate: data.ratesByPlan.enterprise.finalRate,
    },
  ];

  return (
    <Card className="border border-green-100 dark:border-green-900/30 shadow-sm bg-gradient-to-br from-green-50/40 via-white to-purple-50/20 dark:from-green-950/10 dark:to-gray-900 overflow-hidden">
      <CardHeader className="pb-3 pt-5 px-5 sm:px-6 border-b border-gray-100/80 dark:border-gray-800/60">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#25D366] to-emerald-600 flex items-center justify-center shadow-md text-white flex-shrink-0">
              <Gift className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-base sm:text-lg font-black text-gray-900 dark:text-white">
                  {activeLocale === "ar" ? "🎁 ادعُ أصدقاءك واربح رصيدًا" : "🎁 Invite Friends & Earn Credits"}
                </CardTitle>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 border border-green-200/60 dark:border-green-800">
                  {currentRateRange}
                </span>
              </div>

              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 leading-relaxed max-w-2xl">
                {activeLocale === "ar"
                  ? "كل عميل جديد يشترك في Wani من خلالك يمنحك رصيدًا يُخصم تلقائيًا من اشتراكك القادم. وكلما جبت عملاء أكثر، زادت نسبة مكافأتك. 🚀"
                  : "Every new customer who subscribes through you gives you credit applied to your next invoice. The more customers you bring, the higher your reward rate. 🚀"}
              </p>

              <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-gray-500 dark:text-gray-400">
                <Info className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                <span>
                  {activeLocale === "ar"
                    ? `نسبتك الحالية ${currentRateRange} حسب باقة العميل، والحد الأقصى 50%. كل إحالة مدفوعة جديدة تضيف +3%.`
                    : `Your current rate is ${currentRateRange} depending on the customer's plan, capped at 50%. Each new paid referral adds +3%.`}
                </span>
              </div>
            </div>
          </div>

          {data.code && (
            <div className="flex items-center gap-2 self-start sm:self-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3.5 py-1.5 rounded-xl shadow-xs flex-shrink-0">
              <span className="text-[11px] text-gray-400 font-medium">
                {activeLocale === "ar" ? "كودك:" : "Code:"}
              </span>
              <span className="text-xs font-black font-mono tracking-wider text-gray-900 dark:text-white">{data.code}</span>
              <button
                onClick={() => copyToClipboard(data.code!, true)}
                className="text-gray-400 hover:text-[#25D366] transition p-0.5 rounded focus:outline-none"
                title={activeLocale === "ar" ? "نسخ الكود" : "Copy Code"}
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="px-5 sm:px-6 pt-5 pb-6 space-y-5">
        {data.referralLink && (
          <div className="bg-white dark:bg-gray-800/90 rounded-2xl p-3.5 sm:p-4 border border-gray-200/80 dark:border-gray-700 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-9 h-9 rounded-xl bg-green-50 dark:bg-green-900/30 flex items-center justify-center text-[#25D366] flex-shrink-0">
                <Share2 className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  {activeLocale === "ar" ? "رابط الإحالة الخاص بك" : "Your Referral Link"}
                </p>
                <p className="text-xs font-mono text-gray-800 dark:text-gray-200 truncate select-all dir-ltr text-left mt-0.5" dir="ltr">
                  {data.referralLink}
                </p>
              </div>
            </div>

            <Button
              onClick={() => copyToClipboard(data.referralLink!)}
              className="bg-[#25D366] hover:bg-[#20bb5a] text-white font-bold text-xs h-9 px-4 rounded-xl gap-1.5 shadow-xs transition active:scale-95 flex-shrink-0 w-full sm:w-auto"
            >
              {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copiedLink
                ? activeLocale === "ar"
                  ? "تم نسخ الرابط ✓"
                  : "Copied ✓"
                : activeLocale === "ar"
                  ? "نسخ الرابط"
                  : "Copy Link"}
            </Button>
          </div>
        )}

        <div className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-200/80 dark:border-gray-700 shadow-xs p-4">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <p className="text-xs font-black text-gray-900 dark:text-white">
                {activeLocale === "ar" ? "💰 قيمة الإحالة حسب باقة العميل" : "💰 Referral value by customer plan"}
              </p>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
                {activeLocale === "ar"
                  ? "الباقة التي يختارها العميل الجديد هي التي تحدد النسبة الأساسية."
                  : "The new customer's plan determines the base rate."}
              </p>
            </div>
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
              +3% {activeLocale === "ar" ? "لكل إحالة" : "per referral"}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {planRows.map((plan) => {
              const reward = Math.round(plan.price * plan.rate * 100) / 100;
              return (
                <div key={plan.key} className="rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-900/40 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-black text-gray-800 dark:text-gray-100">{plan.label}</span>
                    <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                      {Math.round(plan.rate * 100)}%
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
                    {activeLocale === "ar" ? "تبدأ من" : "Starts at"}{" "}
                    {plan.key === "starter" ? "10%" : plan.key === "pro" ? "25%" : "35%"}
                  </p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
                    {plan.price.toLocaleString(activeLocale === "ar" ? "ar-EG" : "en-US")} {activeLocale === "ar" ? "ج.م" : "EGP"}
                    {" → "}
                    <strong className="text-gray-800 dark:text-gray-200">
                      {reward.toLocaleString(activeLocale === "ar" ? "ar-EG" : "en-US")} {activeLocale === "ar" ? "ج.م رصيد" : "EGP credit"}
                    </strong>
                  </p>
                </div>
              );
            })}
          </div>

          <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-3">
            {activeLocale === "ar"
              ? "الأرقام أعلاه مثال على السعر الشهري. المكافأة الفعلية تُحسب من المبلغ المدفوع فعليًا في عملية الاشتراك."
              : "The amounts above are monthly-price examples. The actual reward is calculated from the amount actually paid in the subscription."}
          </p>
          <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
            {activeLocale === "ar"
              ? "كلما جبت عميلًا مدفوعًا جديدًا، تزيد النسبة القادمة +3% حتى 50%. النسبة المحفوظة لكل مكافأة لا تتغير بعد ذلك."
              : "Each new paid referral adds +3% to the next reward, up to 50%. A saved reward rate never changes later."}
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white dark:bg-gray-800/70 rounded-2xl p-3.5 border border-purple-100 dark:border-purple-900/30 shadow-xs">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
                {activeLocale === "ar" ? "رصيد الإحالات" : "Referral Credit"}
              </span>
              <CreditCard className="w-3.5 h-3.5 text-purple-600" />
            </div>
            <p className="text-lg sm:text-xl font-black text-purple-700 dark:text-purple-400">
              {data.creditBalance.toLocaleString(activeLocale === "ar" ? "ar-EG" : "en-US")}{" "}
              <span className="text-xs font-bold text-gray-400">{activeLocale === "ar" ? "ج.م" : "EGP"}</span>
            </p>
            <p className="text-[10px] text-gray-400 mt-0.5">
              {activeLocale === "ar" ? "يُخصم من اشتراكك القادم" : "Applied on next invoice"}
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800/70 rounded-2xl p-3.5 border border-green-100 dark:border-green-900/30 shadow-xs">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
                {activeLocale === "ar" ? "عملاء مدفوعون" : "Paid Customers"}
              </span>
              <Users className="w-3.5 h-3.5 text-green-600" />
            </div>
            <p className="text-lg sm:text-xl font-black text-green-600 dark:text-green-400">{data.qualifiedCount}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">
              {activeLocale === "ar" ? "أتموا اشتراكًا مدفوعًا" : "Completed paid plan"}
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800/70 rounded-2xl p-3.5 border border-amber-100 dark:border-amber-900/30 shadow-xs">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
                {activeLocale === "ar" ? "قيد الانتظار" : "Pending Signups"}
              </span>
              <Clock className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <p className="text-lg sm:text-xl font-black text-amber-600 dark:text-amber-400">{data.pendingCount}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">
              {activeLocale === "ar" ? "سجلوا ولم يشتركوا بعد" : "Signed up, no payment yet"}
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800/70 rounded-2xl p-3.5 border border-blue-100 dark:border-blue-900/30 shadow-xs">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
                {activeLocale === "ar" ? "نسبتك الحالية" : "Current Rate"}
              </span>
              <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <p className="text-lg sm:text-xl font-black text-blue-600 dark:text-blue-400">{currentRateRange}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">
              {activeLocale === "ar" ? "حسب باقة العميل" : "Depends on customer plan"}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800/70 rounded-2xl p-4 border border-gray-200/80 dark:border-gray-700 shadow-xs">
          <div className="flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-black text-gray-900 dark:text-white">
                {getMotivationText(data.qualifiedCount, data.maxCurrentRate, activeLocale)}
              </p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                {activeLocale === "ar"
                  ? "الحد الأقصى: 50%"
                  : "Maximum: 50%"}
              </p>
            </div>
          </div>
        </div>

        <div className="border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden">
          <button
            onClick={() => setShowProgression((v) => !v)}
            className="w-full flex items-center justify-between gap-3 px-4 py-3 text-xs font-bold text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition"
          >
            <span className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#25D366]" />
              {activeLocale === "ar" ? "شوف كيف تزيد نسبتك 🚀" : "See how your rate increases 🚀"}
            </span>
            {showProgression ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showProgression && (
            <div className="px-4 pb-4 pt-1">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                {PROGRESSION_STEPS.map((step) => (
                  <div
                    key={step.previousQualifiedReferrals}
                    className={`rounded-xl border p-2.5 ${
                      data.qualifiedCount === step.previousQualifiedReferrals
                        ? "border-[#25D366] bg-green-50/70 dark:bg-green-950/20"
                        : "border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30"
                    }`}
                  >
                    <p className="text-[10px] font-bold text-gray-600 dark:text-gray-300">{step.labelAr}</p>
                    <p className="text-sm font-black text-gray-900 dark:text-white mt-0.5">+{step.bonusPercent}%</p>
                    <p className="text-[9px] text-gray-400 mt-0.5">
                      {activeLocale === "ar" ? "زيادة على الـ Base Rate" : "added to base rate"}
                    </p>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-3">
                {activeLocale === "ar"
                  ? "الزيادة تستمر مع كل عميل مدفوع جديد، وتُطبق قاعدة 50% كحد أقصى."
                  : "The increase continues with every new paid customer, capped at 50%."}
              </p>
            </div>
          )}
        </div>

        <div className="flex items-start gap-2 text-[11px] text-gray-500 dark:text-gray-400 bg-gray-50/70 dark:bg-gray-800/40 px-3.5 py-2.5 rounded-xl border border-gray-200/60 dark:border-gray-700/60">
          <Info className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
          <p className="leading-relaxed">
            {activeLocale === "ar"
              ? "النسبة المحفوظة للمكافأة تُحدد وقت أول اشتراك مدفوع للعميل الجديد ولا تتغير لاحقًا. الرصيد يُخصم تلقائيًا من اشتراكك القادم ولا يتحول إلى أموال نقدية."
              : "The reward rate is locked at the referred customer's first successful paid subscription and never changes later. Credit is applied to your next Wani invoice and is not cashable."}
          </p>
        </div>

        <div className="border-t border-gray-100 dark:border-gray-700 pt-3">
          <button
            onClick={() => setShowHistory((v) => !v)}
            className="flex items-center justify-between w-full py-1 text-xs font-bold text-gray-700 dark:text-gray-300 hover:text-[#25D366] transition"
          >
            <span className="flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-400" />
              {activeLocale === "ar" ? `سجل الإحالات (${history.length})` : `Referral History (${history.length})`}
            </span>
            {showHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showHistory && (
            <div className="mt-3 space-y-2">
              {history.length === 0 ? (
                <div className="text-center py-7 px-4 bg-gray-50/60 dark:bg-gray-800/40 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 space-y-1">
                  <p className="text-xs font-bold text-gray-700 dark:text-gray-300">
                    {activeLocale === "ar" ? "لم يسجل أي عميل من خلال رابطك بعد." : "No referrals have signed up yet."}
                  </p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    {activeLocale === "ar"
                      ? "شارك Wani مع أصحابك وابدأ في تقليل فاتورتك القادمة 🚀"
                      : "Share Wani with your friends and start reducing your next bill 🚀"}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-800">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="bg-gray-50/80 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-800 text-gray-400 text-[10px]">
                        <th className="py-2.5 px-3 font-semibold">{activeLocale === "ar" ? "العميل" : "Customer"}</th>
                        <th className="py-2.5 px-3 font-semibold">{activeLocale === "ar" ? "تاريخ التسجيل" : "Signup Date"}</th>
                        <th className="py-2.5 px-3 font-semibold">{activeLocale === "ar" ? "الحالة" : "Status"}</th>
                        <th className="py-2.5 px-3 font-semibold">{activeLocale === "ar" ? "المكافأة" : "Reward"}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-gray-800 bg-white dark:bg-gray-900/40">
                      {history.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition">
                          <td className="py-2.5 px-3 font-medium text-gray-800 dark:text-gray-200">{item.referredName}</td>
                          <td className="py-2.5 px-3 text-gray-400 text-[11px]">
                            {new Date(item.signedUpAt).toLocaleDateString(activeLocale === "ar" ? "ar-EG" : "en-US")}
                          </td>
                          <td className="py-2.5 px-3">
                            {item.status === "QUALIFIED" ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300 border border-green-200/50 dark:border-green-800">
                                <CheckCircle2 className="w-3 h-3 text-green-600" />
                                {item.reward
                                  ? activeLocale === "ar"
                                    ? `مكافأة مكتسبة (${Math.round(item.reward.appliedRate * 100)}%)`
                                    : `Reward Earned (${Math.round(item.reward.appliedRate * 100)}%)`
                                  : activeLocale === "ar"
                                    ? "اشترك"
                                    : "Subscribed"}
                              </span>
                            ) : item.status === "PENDING" ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200/50 dark:border-amber-800">
                                <Clock className="w-3 h-3 text-amber-600" />
                                {activeLocale === "ar" ? "قيد الانتظار" : "Pending"}
                              </span>
                            ) : item.status === "REVERSED" ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200/50 dark:border-rose-800">
                                <XCircle className="w-3 h-3 text-rose-600" />
                                {activeLocale === "ar" ? "تم عكس المكافأة" : "Reward Reversed"}
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                                {activeLocale === "ar" && item.status === "EXPIRED" ? "منتهي الصلاحية" : item.status}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-gray-900 dark:text-white">
                            {item.reward ? (
                              <span className="text-[#25D366]">
                                +{item.reward.rewardAmount} {activeLocale === "ar" ? "ج.م" : "EGP"}
                              </span>
                            ) : (
                              <span className="text-gray-300 dark:text-gray-600">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
