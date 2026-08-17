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
} from "lucide-react";
import type { ReferralStatusResponse, ReferralHistoryItem } from "@/lib/referral/types";

interface ReferralProgramCardProps {
  isFreePlan: boolean;
  locale?: string;
}

export default function ReferralProgramCard({ isFreePlan, locale = "ar" }: ReferralProgramCardProps) {
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
      fetch("/api/referral/status").then(res => res.json()),
      fetch("/api/referral/history").then(res => res.json()),
    ])
      .then(([statusData, historyData]) => {
        setData(statusData);
        if (historyData?.history) {
          setHistory(historyData.history);
        }
      })
      .catch(err => {
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
    } else {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
    toast.success(locale === "ar" ? "تم نسخ الرابط بنجاح!" : "Link copied to clipboard!");
  };

  // ─── إذا كان المستخدم على Free Plan ──────────────────────────────────────────
  if (isFreePlan) {
    return (
      <Card className="border border-purple-100 dark:border-purple-900/30 shadow-sm bg-gradient-to-br from-purple-50/50 via-white to-green-50/30 dark:from-purple-950/10 dark:to-gray-900">
        <CardContent className="p-6">
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
                    ? "اشترك في إحدى باقات Wani لفتح رابط الإحالة الخاص بك وكسب رصيد يُخصم من اشتراكك القادم مع كل عميل يدخل من خلالك."
                    : "Subscribe to any Wani paid plan to unlock your unique referral link and earn credits off your next invoice for every customer you refer."}
                </p>
              </div>
            </div>

            <Button
              onClick={() => (window.location.href = "/checkout?plan=pro")}
              className="bg-[#25D366] hover:bg-[#20bb5a] text-white font-bold text-xs h-9 px-4 rounded-xl gap-1.5 shadow-sm flex-shrink-0"
            >
              <ArrowUpRight className="w-4 h-4" />
              {locale === "ar" ? "ترقية الباقة الآن" : "Upgrade Plan Now"}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ─── Loading State ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <Card className="border border-gray-100 dark:border-gray-800 shadow-sm animate-pulse p-6">
        <div className="h-6 w-1/3 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
        <div className="h-20 bg-gray-100 dark:bg-gray-800 rounded-xl mb-4" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded-xl" />
          ))}
        </div>
      </Card>
    );
  }

  if (!data) return null;

  const currentRatePercent = Math.round(data.currentRate * 100);
  const nextRatePercent = data.nextTier ? Math.round(data.nextTier.rate * 100) : null;

  return (
    <Card className="border border-green-100 dark:border-green-900/30 shadow-sm bg-gradient-to-br from-green-50/40 via-white to-purple-50/20 dark:from-green-950/10 dark:to-gray-900 overflow-hidden">
      {/* Header */}
      <CardHeader className="pb-3 pt-5 px-5 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#25D366] to-emerald-600 flex items-center justify-center shadow-md text-white flex-shrink-0">
              <Gift className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-base sm:text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                <span>{locale === "ar" ? "🎁 ادعُ أصدقاءك واربح خصمًا" : "🎁 Invite Friends & Earn Credits"}</span>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300">
                  {currentRatePercent}% {locale === "ar" ? "عمولة" : "Commission"}
                </span>
              </CardTitle>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {locale === "ar"
                  ? "كل عميل جديد يشترك في Wani من خلالك يمنحك رصيدًا يُخصم من اشتراكك القادم."
                  : "Every customer who subscribes through your link grants you credit applied to your next invoice."}
              </p>
            </div>
          </div>

          {/* Referral Code Badge */}
          {data.code && (
            <div className="flex items-center gap-2 self-start sm:self-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-1.5 rounded-xl shadow-xs">
              <span className="text-[11px] text-gray-400 font-medium">{locale === "ar" ? "كودك:" : "Code:"}</span>
              <span className="text-xs font-black font-mono tracking-wider text-gray-900 dark:text-white">{data.code}</span>
              <button
                onClick={() => copyToClipboard(data.code!, true)}
                className="text-gray-400 hover:text-[#25D366] transition ml-1"
                title={locale === "ar" ? "نسخ الكود" : "Copy Code"}
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="px-5 sm:px-6 pb-6 space-y-5">
        {/* Referral Link Copy Box */}
        {data.referralLink && (
          <div className="bg-white dark:bg-gray-800/80 rounded-2xl p-3 sm:p-4 border border-gray-200/80 dark:border-gray-700 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="w-8 h-8 rounded-xl bg-green-50 dark:bg-green-900/30 flex items-center justify-center text-[#25D366] flex-shrink-0">
                <Share2 className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{locale === "ar" ? "رابط الإحالة الخاص بك" : "Your Referral Link"}</p>
                <p className="text-xs font-mono text-gray-800 dark:text-gray-200 truncate select-all dir-ltr text-left" dir="ltr">
                  {data.referralLink}
                </p>
              </div>
            </div>

            <Button
              onClick={() => copyToClipboard(data.referralLink!)}
              className="bg-[#25D366] hover:bg-[#20bb5a] text-white font-bold text-xs h-9 px-4 rounded-xl gap-1.5 shadow-xs transition active:scale-95 flex-shrink-0"
            >
              {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copiedLink ? (locale === "ar" ? "تم النسخ" : "Copied!") : (locale === "ar" ? "نسخ الرابط" : "Copy Link")}
            </Button>
          </div>
        )}

        {/* 4 Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Stat 1: Credit Balance */}
          <div className="bg-white dark:bg-gray-800/60 rounded-2xl p-3.5 border border-purple-100 dark:border-purple-900/30 shadow-xs">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">{locale === "ar" ? "رصيد الإحالات" : "Credit Balance"}</span>
              <div className="w-6 h-6 rounded-lg bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center text-purple-600">
                <CreditCard className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="text-lg sm:text-xl font-black text-purple-700 dark:text-purple-400">
              {data.creditBalance.toLocaleString("ar-EG")} <span className="text-xs font-bold text-gray-400">{locale === "ar" ? "ج.م" : "EGP"}</span>
            </p>
            <p className="text-[10px] text-gray-400 mt-0.5">{locale === "ar" ? "يُخصم من اشتراكك القادم" : "Applied on renewal"}</p>
          </div>

          {/* Stat 2: Qualified Customers */}
          <div className="bg-white dark:bg-gray-800/60 rounded-2xl p-3.5 border border-green-100 dark:border-green-900/30 shadow-xs">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">{locale === "ar" ? "عملاء مدفوعين" : "Paid Customers"}</span>
              <div className="w-6 h-6 rounded-lg bg-green-50 dark:bg-green-900/30 flex items-center justify-center text-green-600">
                <Users className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="text-lg sm:text-xl font-black text-green-600 dark:text-green-400">
              {data.qualifiedCount} <span className="text-xs font-normal text-gray-400">{locale === "ar" ? "عميل" : "customers"}</span>
            </p>
            <p className="text-[10px] text-gray-400 mt-0.5">{locale === "ar" ? "أتموا اشتراكًا مدفوعًا" : "Completed subscription"}</p>
          </div>

          {/* Stat 3: Pending Referrals */}
          <div className="bg-white dark:bg-gray-800/60 rounded-2xl p-3.5 border border-amber-100 dark:border-amber-900/30 shadow-xs">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">{locale === "ar" ? "قيد الانتظار" : "Pending Signups"}</span>
              <div className="w-6 h-6 rounded-lg bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center text-amber-600">
                <Clock className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="text-lg sm:text-xl font-black text-amber-600 dark:text-amber-400">
              {data.pendingCount} <span className="text-xs font-normal text-gray-400">{locale === "ar" ? "مسجل" : "signups"}</span>
            </p>
            <p className="text-[10px] text-gray-400 mt-0.5">{locale === "ar" ? "بانتظار الترقية للباقة" : "Awaiting payment"}</p>
          </div>

          {/* Stat 4: Commission Rate */}
          <div className="bg-white dark:bg-gray-800/60 rounded-2xl p-3.5 border border-blue-100 dark:border-blue-900/30 shadow-xs">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">{locale === "ar" ? "نسبتك الحالية" : "Current Rate"}</span>
              <div className="w-6 h-6 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
                <TrendingUp className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="text-lg sm:text-xl font-black text-blue-600 dark:text-blue-400">
              {currentRatePercent}%
            </p>
            <p className="text-[10px] text-gray-400 mt-0.5 truncate">{data.currentTier}</p>
          </div>
        </div>

        {/* Tier Progress Bar */}
        <div className="bg-white dark:bg-gray-800/60 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 shadow-xs space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span className="font-bold text-gray-800 dark:text-gray-200">
                {locale === "ar" ? "المستوى القادم للعمولة:" : "Next Commission Tier:"}
              </span>
              {data.nextTier ? (
                <span className="font-extrabold text-[#25D366]">
                  {nextRatePercent}% ({data.nextTier.minQualified} {locale === "ar" ? "عملاء" : "referrals"})
                </span>
              ) : (
                <span className="font-extrabold text-amber-600">{locale === "ar" ? "أعلى مستوى تم الوصول إليه 🏆" : "Top Tier Reached 🏆"}</span>
              )}
            </div>

            {data.nextTier && (
              <span className="text-[11px] font-semibold text-gray-500">
                {locale === "ar"
                  ? `${data.qualifiedCount} / ${data.nextTier.minQualified} عملاء (${data.referralsNeededForNextTier} متبقي للوصول إلى ${nextRatePercent}%)`
                  : `${data.qualifiedCount} / ${data.nextTier.minQualified} (${data.referralsNeededForNextTier} needed for ${nextRatePercent}%)`}
              </span>
            )}
          </div>

          <Progress
            value={data.progressPercent}
            className="h-2 rounded-full [&>div]:bg-gradient-to-r [&>div]:from-[#25D366] [&>div]:to-emerald-500"
          />
        </div>

        {/* Referral History Collapsible */}
        <div className="border-t border-gray-100 dark:border-gray-700 pt-3">
          <button
            onClick={() => setShowHistory(v => !v)}
            className="flex items-center justify-between w-full py-1 text-xs font-bold text-gray-600 dark:text-gray-300 hover:text-[#25D366] transition"
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
                <div className="text-center py-6 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-gray-400">{locale === "ar" ? "لم يسجل أي عميل من خلال رابطك بعد." : "No referrals yet."}</p>
                  <p className="text-[11px] text-gray-500 mt-1">{locale === "ar" ? "شارك رابط الإحالة مع أصدقائك وابدأ في كسب رصيد لاشتراكك!" : "Share your link and start earning subscription credits!"}</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-gray-800 text-gray-400 text-[10px]">
                        <th className="py-2 px-3 font-semibold">{locale === "ar" ? "العميل" : "Customer"}</th>
                        <th className="py-2 px-3 font-semibold">{locale === "ar" ? "تاريخ التسجيل" : "Signup Date"}</th>
                        <th className="py-2 px-3 font-semibold">{locale === "ar" ? "الحالة" : "Status"}</th>
                        <th className="py-2 px-3 font-semibold">{locale === "ar" ? "المكافأة" : "Reward"}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                      {history.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                          <td className="py-2.5 px-3 font-medium text-gray-800 dark:text-gray-200">{item.referredName}</td>
                          <td className="py-2.5 px-3 text-gray-400 text-[11px]">
                            {new Date(item.signedUpAt).toLocaleDateString(locale === "ar" ? "ar-EG" : "en-US")}
                          </td>
                          <td className="py-2.5 px-3">
                            {item.status === "QUALIFIED" ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300">
                                <Check className="w-2.5 h-2.5" />
                                {locale === "ar" ? "مشترك مدفوع" : "Paid"}
                              </span>
                            ) : item.status === "PENDING" ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                                <Clock className="w-2.5 h-2.5" />
                                {locale === "ar" ? "بانتظار الاشتراك" : "Pending"}
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                                {item.status}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-gray-900 dark:text-white">
                            {item.reward ? (
                              <span className="text-[#25D366]">+{item.reward.rewardAmount} {locale === "ar" ? "ج.م" : "EGP"}</span>
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
