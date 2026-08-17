// src/components/dashboard/ReferralProgramCard.tsx
"use client";

import { useState, useEffect } from "react";
import { useLanguage } from "@/lib/language-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
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
import { SUBSCRIPTION_PLANS, type PlanSlug } from "@/lib/pricing";

interface ReferralProgramCardProps {
  isFreePlan: boolean;
  userPlan?: string;
  locale?: string;
}

// ─── دالة مساعدة لصياغة نصوص شريط التقدم باللغة العربية بدقة ────────────────
function getTierProgressText({
  qualifiedCount,
  nextTier,
  currentRatePercent,
  referralsNeeded,
  locale,
}: {
  qualifiedCount: number;
  nextTier: ReferralStatusResponse["nextTier"];
  currentRatePercent: number;
  referralsNeeded: number;
  locale: string;
}) {
  if (!nextTier) {
    return {
      statusTitle:
        locale === "ar"
          ? `🎉 وصلت إلى أعلى مستوى (${currentRatePercent}%)!`
          : `🎉 Top tier reached (${currentRatePercent}%)!`,
      statusSubtitle:
        locale === "ar"
          ? "أنت تستمتع بأعلى نسبة رصيد إحالة ممكنة 🏆"
          : "You are enjoying the maximum referral credit rate 🏆",
      nextTierGoal: null,
    };
  }

  const target = nextTier.minQualified;
  const nextRatePercent = Math.round(nextTier.rate * 100);

  if (locale === "ar") {
    // صياغة عدد المؤهلين الحاليين
    let qualifiedLabel = "";
    if (qualifiedCount === 0) {
      qualifiedLabel = `0 من ${target} عملاء مدفوعين`;
    } else if (qualifiedCount === 1) {
      qualifiedLabel = `عميل مدفوع واحد من ${target}`;
    } else if (qualifiedCount === 2) {
      qualifiedLabel = `عميلان مدفوعان من ${target}`;
    } else if (qualifiedCount >= 3 && qualifiedCount <= 10) {
      qualifiedLabel = `${qualifiedCount} عملاء مدفوعين من ${target}`;
    } else {
      qualifiedLabel = `${qualifiedCount} عميلاً مدفوعاً من ${target}`;
    }

    // صياغة المتبقي للوصول للنسبة القادمة
    let neededLabel = "";
    if (referralsNeeded <= 0) {
      neededLabel = `🎉 وصلت إلى مستوى ${nextRatePercent}%!`;
    } else if (referralsNeeded === 1) {
      neededLabel = `تبقى إحالة واحدة للوصول إلى ${nextRatePercent}%`;
    } else if (referralsNeeded === 2) {
      neededLabel = `تبقى إحالتان للوصول إلى ${nextRatePercent}%`;
    } else if (referralsNeeded === 3 && qualifiedCount === 0) {
      neededLabel = `تحتاج 3 إحالات مدفوعة للوصول إلى ${nextRatePercent}%`;
    } else if (referralsNeeded >= 3 && referralsNeeded <= 10) {
      neededLabel = `تحتاج ${referralsNeeded} إحالات مدفوعة للوصول إلى ${nextRatePercent}%`;
    } else {
      neededLabel = `تحتاج ${referralsNeeded} إحالة مدفوعة للوصول إلى ${nextRatePercent}%`;
    }

    return {
      statusTitle: qualifiedLabel,
      statusSubtitle: neededLabel,
      nextTierGoal: `${nextRatePercent}% عند ${target} عملاء مدفوعين`,
    };
  } else {
    return {
      statusTitle: `${qualifiedCount} of ${target} paid customers`,
      statusSubtitle:
        referralsNeeded > 0
          ? `Need ${referralsNeeded} more paid referral${referralsNeeded > 1 ? "s" : ""} to reach ${nextRatePercent}%`
          : `🎉 Reached ${nextRatePercent}% tier!`,
      nextTierGoal: `${nextRatePercent}% at ${target} paid customers`,
    };
  }
}

// ─── تنظيف اسم المستوى من النسبة المكررة بين القوسين ──────────────────────────
function formatTierLabel(tierLabel: string, locale: string): string {
  if (!tierLabel) return locale === "ar" ? "المستوى الأول" : "Tier 1";
  const cleaned = tierLabel.replace(/\s*\(\d+%\)/g, "").trim();
  if (locale !== "ar") {
    if (cleaned.includes("الأول")) return "Tier 1";
    if (cleaned.includes("الثاني")) return "Tier 2";
    if (cleaned.includes("الثالث")) return "Tier 3";
    if (cleaned.includes("المتميز")) return "Elite Tier";
  }
  return cleaned || tierLabel;
}

export default function ReferralProgramCard({ isFreePlan, userPlan = "pro", locale = "ar" }: ReferralProgramCardProps) {
  const [data, setData] = useState<ReferralStatusResponse | null>(null);
  const [history, setHistory] = useState<ReferralHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

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
        setData(statusData);
        if (historyData?.history) {
          setHistory(historyData.history);
        }
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
      toast.success(locale === "ar" ? "تم نسخ كود الإحالة ✓" : "Referral code copied ✓");
    } else {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
      toast.success(locale === "ar" ? "تم نسخ الرابط بنجاح ✓" : "Referral link copied ✓");
    }
  };

  // ─── 1. في حالة الحساب المجاني (Free Plan) ───────────────────────────────────
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
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-gray-900 dark:text-white text-base">
                    {locale === "ar" ? "🎁 برنامج الإحالة متاح للمشتركين المدفوعين" : "🎁 Referral Program for Paid Subscribers"}
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300">
                    {locale === "ar" ? "حصري" : "Exclusive"}
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed max-w-xl">
                  {locale === "ar"
                    ? "اشترك في إحدى باقات Wani لفتح رابط الإحالة الخاص بك وكسب رصيد يُخصم تلقائيًا من اشتراكك القادم مع كل عميل يشترك من خلالك."
                    : "Subscribe to any Wani paid plan to unlock your unique referral link and earn credits automatically applied to your next invoice for every customer you refer."}
                </p>
              </div>
            </div>

            <Button
              onClick={() => (window.location.href = "/checkout?plan=pro")}
              className="bg-[#25D366] hover:bg-[#20bb5a] text-white font-bold text-xs h-9 px-4 rounded-xl gap-1.5 shadow-sm flex-shrink-0 w-full sm:w-auto"
            >
              <ArrowUpRight className="w-4 h-4" />
              {locale === "ar" ? "ترقية الباقة الآن" : "Upgrade Plan Now"}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ─── 2. حالة التحميل (Loading State) ─────────────────────────────────────────
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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-gray-100 dark:bg-gray-800 rounded-2xl" />
          ))}
        </div>
        <div className="h-14 bg-gray-100 dark:bg-gray-800 rounded-2xl" />
      </Card>
    );
  }

  if (!data) return null;

  const currentRatePercent = Math.round((data.currentRate || 0.10) * 100);
  const cleanCurrentTier = formatTierLabel(data.currentTier, locale);

  // حساب المثال التوضيحي ديناميكياً بناءً على باقة المستخدم الحالية ونسبته الحالية
  const planKey = (userPlan && userPlan.toLowerCase() in SUBSCRIPTION_PLANS ? userPlan.toLowerCase() : "pro") as PlanSlug;
  const currentPlanConfig = SUBSCRIPTION_PLANS[planKey] ?? SUBSCRIPTION_PLANS.pro;
  const benchmarkPlanPrice = currentPlanConfig.monthly;
  const benchmarkPlanName = currentPlanConfig.name;
  const calculatedExampleReward = ((benchmarkPlanPrice * (data.currentRate || 0.10))).toFixed(2).replace(/\.00$/, "");

  // صياغة نصوص التقدم
  const progressTexts = getTierProgressText({
    qualifiedCount: data.qualifiedCount,
    nextTier: data.nextTier,
    currentRatePercent,
    referralsNeeded: data.referralsNeededForNextTier,
    locale,
  });

  return (
    <Card className="border border-green-100 dark:border-green-900/30 shadow-sm bg-gradient-to-br from-green-50/40 via-white to-purple-50/20 dark:from-green-950/10 dark:to-gray-900 overflow-hidden">
      {/* ── 1 & 2. Header & Current Rate ──────────────────────────────────────── */}
      <CardHeader className="pb-3 pt-5 px-5 sm:px-6 border-b border-gray-100/80 dark:border-gray-800/60">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#25D366] to-emerald-600 flex items-center justify-center shadow-md text-white flex-shrink-0 mt-0.5">
              <Gift className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-base sm:text-lg font-black text-gray-900 dark:text-white">
                  {locale === "ar" ? "🎁 ادعُ أصدقاءك واربح رصيدًا" : "🎁 Invite Friends & Earn Credits"}
                </CardTitle>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 border border-green-200/60 dark:border-green-800">
                  {currentRatePercent}% {locale === "ar" ? "رصيد إحالة" : "Referral Credit"}
                </span>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 leading-relaxed">
                {locale === "ar"
                  ? "كل عميل جديد يشترك في Wani من خلالك يمنحك رصيدًا يُخصم تلقائيًا من اشتراكك القادم. 🚀"
                  : "Every new customer who subscribes to Wani through your link grants you credit automatically applied to your next invoice. 🚀"}
              </p>
              <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-gray-500 dark:text-gray-400">
                <Info className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                <span>
                  {locale === "ar"
                    ? `تحصل على ${currentRatePercent}% من قيمة أول اشتراك مدفوع للعميل الذي أحلته، ويُضاف المبلغ إلى رصيدك.`
                    : `You earn ${currentRatePercent}% of the first paid subscription from each customer you refer, added directly to your credit balance.`}
                </span>
              </div>
            </div>
          </div>

          {/* ── 3. Referral Code Badge ─────────────────────────────────────────── */}
          {data.code && (
            <div className="flex items-center gap-2 self-start sm:self-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3.5 py-1.5 rounded-xl shadow-xs flex-shrink-0">
              <span className="text-[11px] text-gray-400 font-medium">{locale === "ar" ? "كودك:" : "Code:"}</span>
              <span className="text-xs font-black font-mono tracking-wider text-gray-900 dark:text-white">{data.code}</span>
              <button
                onClick={() => copyToClipboard(data.code!, true)}
                className="text-gray-400 hover:text-[#25D366] transition p-0.5 rounded focus:outline-none"
                title={locale === "ar" ? "نسخ الكود" : "Copy Code"}
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="px-5 sm:px-6 pt-5 pb-6 space-y-5">
        {/* ── 4. Referral Link Box ────────────────────────────────────────────── */}
        {data.referralLink && (
          <div className="bg-white dark:bg-gray-800/90 rounded-2xl p-3.5 sm:p-4 border border-gray-200/80 dark:border-gray-700 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-9 h-9 rounded-xl bg-green-50 dark:bg-green-900/30 flex items-center justify-center text-[#25D366] flex-shrink-0">
                <Share2 className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  {locale === "ar" ? "رابط الإحالة الخاص بك" : "Your Referral Link"}
                </p>
                <p
                  className="text-xs font-mono text-gray-800 dark:text-gray-200 truncate select-all dir-ltr text-left mt-0.5"
                  dir="ltr"
                  title={data.referralLink}
                >
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
                ? locale === "ar"
                  ? "تم نسخ الرابط ✓"
                  : "Copied ✓"
                : locale === "ar"
                  ? "نسخ الرابط"
                  : "Copy Link"}
            </Button>
          </div>
        )}

        {/* ── 5. Reward Example Box (Dynamic per Plan & Tier) ─────────────────── */}
        <div className="bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-900/40 rounded-xl p-3 flex items-center gap-2.5 text-xs text-amber-900 dark:text-amber-300">
          <span className="text-base flex-shrink-0">💡</span>
          <div className="flex-1 leading-relaxed">
            <span className="font-bold">{locale === "ar" ? "مثال توضيحي: " : "Example: "}</span>
            {locale === "ar" ? (
              <span>
                عميل اشترك في باقة <strong>{benchmarkPlanName}</strong> بـ <strong>{benchmarkPlanPrice} ج.م</strong> (لأول اشتراك مدفوع) ← تحصل على{" "}
                <strong className="text-emerald-700 dark:text-emerald-400 font-bold">{calculatedExampleReward} ج.م رصيد</strong> يُخصم
                تلقائيًا من اشتراكك القادم.
              </span>
            ) : (
              <span>
                A customer subscribes to <strong>{benchmarkPlanName}</strong> for <strong>{benchmarkPlanPrice} EGP</strong> (first paid subscription) → You earn{" "}
                <strong className="text-emerald-700 dark:text-emerald-400 font-bold">{calculatedExampleReward} EGP credit</strong> applied
                to your next bill.
              </span>
            )}
          </div>
        </div>

        {/* ── 6 & 7. 4 Statistics Cards ──────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Card 1: Referral Credit */}
          <div className="bg-white dark:bg-gray-800/70 rounded-2xl p-3.5 border border-purple-100 dark:border-purple-900/30 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
                {locale === "ar" ? "رصيد الإحالات" : "Referral Credit"}
              </span>
              <div className="w-6 h-6 rounded-lg bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center text-purple-600">
                <CreditCard className="w-3.5 h-3.5" />
              </div>
            </div>
            <div>
              <p className="text-lg sm:text-xl font-black text-purple-700 dark:text-purple-400">
                {data.creditBalance.toLocaleString(locale === "ar" ? "ar-EG" : "en-US")}{" "}
                <span className="text-xs font-bold text-gray-400">{locale === "ar" ? "ج.م" : "EGP"}</span>
              </p>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                {locale === "ar" ? "يُخصم من اشتراكك القادم" : "Applied on renewal"}
              </p>
            </div>
          </div>

          {/* Card 2: Paid Customers */}
          <div className="bg-white dark:bg-gray-800/70 rounded-2xl p-3.5 border border-green-100 dark:border-green-900/30 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
                {locale === "ar" ? "عملاء مدفوعون" : "Paid Customers"}
              </span>
              <div className="w-6 h-6 rounded-lg bg-green-50 dark:bg-green-900/30 flex items-center justify-center text-green-600">
                <Users className="w-3.5 h-3.5" />
              </div>
            </div>
            <div>
              <p className="text-lg sm:text-xl font-black text-green-600 dark:text-green-400">
                {data.qualifiedCount}
              </p>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                {locale === "ar" ? "أتموا اشتراكًا مدفوعًا" : "Completed paid plan"}
              </p>
            </div>
          </div>

          {/* Card 3: Pending Referrals */}
          <div className="bg-white dark:bg-gray-800/70 rounded-2xl p-3.5 border border-amber-100 dark:border-amber-900/30 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
                {locale === "ar" ? "قيد الانتظار" : "Pending Signups"}
              </span>
              <div className="w-6 h-6 rounded-lg bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center text-amber-600">
                <Clock className="w-3.5 h-3.5" />
              </div>
            </div>
            <div>
              <p className="text-lg sm:text-xl font-black text-amber-600 dark:text-amber-400">
                {data.pendingCount}
              </p>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                {locale === "ar" ? "سجلوا ولم يشتركوا بعد" : "Signed up, no payment yet"}
              </p>
            </div>
          </div>

          {/* Card 4: Current Rate & Dynamic Tier Level */}
          <div className="bg-white dark:bg-gray-800/70 rounded-2xl p-3.5 border border-blue-100 dark:border-blue-900/30 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
                {locale === "ar" ? "نسبتك الحالية" : "Current Rate"}
              </span>
              <div className="w-6 h-6 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
                <TrendingUp className="w-3.5 h-3.5" />
              </div>
            </div>
            <div>
              <p className="text-lg sm:text-xl font-black text-blue-600 dark:text-blue-400">
                {currentRatePercent}%
              </p>
              <p className="text-[11px] text-gray-800 dark:text-gray-200 mt-0.5 font-bold truncate">
                {cleanCurrentTier}
              </p>
              {data.nextTier && (
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5 truncate">
                  {locale === "ar"
                    ? `القادم: ${Math.round(data.nextTier.rate * 100)}% (${data.nextTier.minQualified} عملاء)`
                    : `Next: ${Math.round(data.nextTier.rate * 100)}% (${data.nextTier.minQualified} refs)`}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ── 8. Progress Bar & Next Tier ─────────────────────────────────────── */}
        <div className="bg-white dark:bg-gray-800/70 rounded-2xl p-4 border border-gray-200/80 dark:border-gray-700 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500 flex-shrink-0" />
              <span className="font-bold text-gray-800 dark:text-gray-200">
                {progressTexts.statusTitle}
              </span>
            </div>

            {progressTexts.nextTierGoal && (
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-gray-400">
                  {locale === "ar" ? "المستوى القادم:" : "Next Tier:"}
                </span>
                <span className="text-[11px] font-extrabold text-[#25D366] bg-green-50 dark:bg-green-950/40 px-2 py-0.5 rounded-full border border-green-100 dark:border-green-900/40">
                  {progressTexts.nextTierGoal}
                </span>
              </div>
            )}
          </div>

          <Progress
            value={data.progressPercent}
            className="h-2 rounded-full [&>div]:bg-gradient-to-r [&>div]:from-[#25D366] [&>div]:to-emerald-500"
          />

          <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">
            {progressTexts.statusSubtitle}
          </p>
        </div>

        {/* ── 9. Important Clarification Note ─────────────────────────────────── */}
        <div className="flex items-start gap-2 text-[11px] text-gray-500 dark:text-gray-400 bg-gray-50/70 dark:bg-gray-800/40 px-3.5 py-2.5 rounded-xl border border-gray-200/60 dark:border-gray-700/60">
          <Info className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
          <p className="leading-relaxed">
            {locale === "ar"
              ? "النسبة تُطبق على أول اشتراك مدفوع لكل عميل جديد أحلته. يُخصم الرصيد تلقائيًا لتقليل فاتورة اشتراكك القادمة في Wani ولا يتحول إلى أموال نقدية."
              : "The percentage applies to the first paid subscription of each new customer you refer. Credit is automatically deducted to reduce your next Wani subscription invoice and cannot be redeemed as cash."}
          </p>
        </div>

        {/* ── 10. Referral History Collapsible ─────────────────────────────────── */}
        <div className="border-t border-gray-100 dark:border-gray-700 pt-3">
          <button
            onClick={() => setShowHistory((v) => !v)}
            className="flex items-center justify-between w-full py-1 text-xs font-bold text-gray-700 dark:text-gray-300 hover:text-[#25D366] transition"
          >
            <span className="flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-400" />
              {locale === "ar" ? `سجل الإحالات (${history.length})` : `Referral History (${history.length})`}
            </span>
            {showHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showHistory && (
            <div className="mt-3 space-y-2">
              {history.length === 0 ? (
                <div className="text-center py-7 px-4 bg-gray-50/60 dark:bg-gray-800/40 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 space-y-1">
                  <p className="text-xs font-bold text-gray-700 dark:text-gray-300">
                    {locale === "ar" ? "لم يسجل أي عميل من خلال رابطك بعد." : "No referrals have signed up yet."}
                  </p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    {locale === "ar"
                      ? "شارك Wani مع أصحابك وابدأ في تقليل فاتورتك القادمة 🚀"
                      : "Share Wani with your friends and start reducing your next bill 🚀"}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-800">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="bg-gray-50/80 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-800 text-gray-400 text-[10px]">
                        <th className="py-2.5 px-3 font-semibold">{locale === "ar" ? "العميل" : "Customer"}</th>
                        <th className="py-2.5 px-3 font-semibold">{locale === "ar" ? "تاريخ التسجيل" : "Signup Date"}</th>
                        <th className="py-2.5 px-3 font-semibold">{locale === "ar" ? "الحالة" : "Status"}</th>
                        <th className="py-2.5 px-3 font-semibold">{locale === "ar" ? "المكافأة" : "Reward"}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-gray-800 bg-white dark:bg-gray-900/40">
                      {history.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition">
                          <td className="py-2.5 px-3 font-medium text-gray-800 dark:text-gray-200">
                            {item.referredName}
                          </td>
                          <td className="py-2.5 px-3 text-gray-400 text-[11px]">
                            {new Date(item.signedUpAt).toLocaleDateString(locale === "ar" ? "ar-EG" : "en-US")}
                          </td>
                          <td className="py-2.5 px-3">
                            {item.status === "QUALIFIED" ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300 border border-green-200/50 dark:border-green-800">
                                <CheckCircle2 className="w-3 h-3 text-green-600" />
                                {item.reward
                                  ? locale === "ar"
                                    ? "مكافأة مكتسبة"
                                    : "Reward Earned"
                                  : locale === "ar"
                                    ? "اشترك"
                                    : "Subscribed"}
                              </span>
                            ) : item.status === "PENDING" ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200/50 dark:border-amber-800">
                                <Clock className="w-3 h-3 text-amber-600" />
                                {locale === "ar" ? "قيد الانتظار" : "Pending"}
                              </span>
                            ) : item.status === "REVERSED" ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200/50 dark:border-rose-800">
                                <XCircle className="w-3 h-3 text-rose-600" />
                                {locale === "ar" ? "تم عكس المكافأة" : "Reward Reversed"}
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                                {locale === "ar" && item.status === "EXPIRED" ? "منتهي الصلاحية" : item.status}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-gray-900 dark:text-white">
                            {item.reward ? (
                              <span className="text-[#25D366]">
                                +{item.reward.rewardAmount} {locale === "ar" ? "ج.م" : "EGP"}
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
