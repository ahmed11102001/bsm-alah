"use client";

import { useState } from "react";
import { useLanguage } from "@/lib/language-context";
import { useSubscription, type DashboardData } from "@/lib/dashboard-context";
import { SUBSCRIPTION_PLANS } from "@/lib/pricing";
import { PLAN_COLORS, limitLabel, usagePct } from "@/app/dashboard/_shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  Bot, Sparkles, Loader2, BarChart3, Star, RefreshCw, ArrowUpRight,
} from "lucide-react";
import ReferralProgramCard from "@/components/dashboard/ReferralProgramCard";

// ─── PlanCard Component ──────────────────────────────────────────────────────
function PlanCard({ plan }: { plan: DashboardData["plan"] }) {
  const { t } = useLanguage();
  const p = t.home.plan;
  const contactsPct = usagePct(plan.usage.contacts, plan.limits.contacts);
  const campaignsPct = usagePct(plan.usage.campaignsThisMonth, plan.limits.campaignsPerMonth);
  const teamPct = usagePct(plan.usage.teamMembers, plan.limits.teamMembers);
  const isNearLimit = (pct: number) => pct >= 80;
  const isEnterprise = plan.plan === "enterprise";

  return (
    <Card className="border border-gray-100 dark:border-gray-700 shadow-sm mb-6">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Star className="w-4 h-4 text-amber-500" />
              <span className="font-bold text-sm">{p.title}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${PLAN_COLORS[plan.plan] ?? "bg-gray-100 text-gray-600"}`}>
                {plan.planName}
              </span>
              <span className="text-xs text-gray-400">{plan.status === "active" ? p.active : p.expired}</span>
            </div>
          </div>
          {!isEnterprise && (
            <div className="flex gap-2 flex-shrink-0">
              <Button size="sm" variant="outline"
                className="text-xs h-8 gap-1 hover:border-[#25D366] hover:text-[#25D366] hidden sm:flex"
                onClick={() => toast.info("قريباً — نظام الدفع")}>
                <RefreshCw className="w-3 h-3" /> {p.changePlan}
              </Button>
              <Button size="sm"
                className="text-xs h-8 gap-1 bg-[#25D366] hover:bg-[#20bb5a] text-white"
                onClick={() => toast.info("قريباً — نظام الدفع")}>
                <ArrowUpRight className="w-3 h-3" /> {p.upgrade}
              </Button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: p.contacts, used: plan.usage.contacts, limit: plan.limits.contacts, pct: contactsPct },
            { label: p.campaignsMonth, used: plan.usage.campaignsThisMonth, limit: plan.limits.campaignsPerMonth, pct: campaignsPct },
            { label: p.teamMembers, used: plan.usage.teamMembers, limit: plan.limits.teamMembers, pct: teamPct },
          ].map(item => (
            <div key={item.label}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-gray-500 dark:text-gray-400">{item.label}</span>
                <span className={`text-xs font-semibold ${isNearLimit(item.pct) ? "text-orange-500" : ""}`}>
                  {item.used.toLocaleString()} / {limitLabel(item.limit)}
                </span>
              </div>
              <Progress value={item.pct} className={`h-1.5 ${isNearLimit(item.pct) ? "[&>div]:bg-orange-400" : "[&>div]:bg-[#25D366]"}`} />
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-1.5 mt-4 pt-4 border-t border-gray-50 dark:border-gray-700">
          {(Object.entries(p.features) as [keyof typeof p.features, string][]).map(([key, label]) => {
            const on = plan.limits[key as keyof typeof plan.limits] as boolean;
            return (
              <span key={key} className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${on ? "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                : "bg-gray-100 text-gray-400 dark:bg-gray-700 line-through"
                }`}>{label}</span>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── WANI AI Enterprise Token Card ───────────────────────────────────────────
function EnterpriseTokenCard({ data }: { data: DashboardData }) {
  const { t, locale } = useLanguage();
  const ai = t.home.ai;

  const aiData = (data.plan as any).aiTokens;
  const used = aiData?.aiTokensUsedThisMonth ?? 0;
  const bonus = aiData?.aiTokensBonusBalance ?? 0;
  const monthly = data.plan.limits.aiTokensPerMonth;
  const pct = monthly > 0 ? Math.min(100, Math.round((used / monthly) * 100)) : 0;
  const fmtK = (n: number) =>
    n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M`
      : n >= 1_000 ? `${Math.round(n / 1000)}K`
        : `${n}`;

  return (
    <Card className="border border-purple-100 dark:border-purple-900/30 shadow-sm bg-gradient-to-br from-purple-50/60 to-white dark:from-purple-950/10 dark:to-gray-900">
      <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4 sm:px-5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center">
            <Bot className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <CardTitle className="text-sm font-bold text-gray-900 dark:text-white">{ai.title}</CardTitle>
            <p className="text-[11px] text-gray-400 dark:text-gray-500">{ai.renews}</p>
          </div>
        </div>
        {pct >= 80 && (
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${pct >= 95 ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" : "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"}`}>
            {pct}%
          </span>
        )}
      </CardHeader>

      <CardContent className="px-4 sm:px-5 pb-5 space-y-4">
        <div>
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1.5">
            <span>{locale === "ar" ? "مستخدم" : "Used"}: <span className="font-semibold text-gray-700 dark:text-gray-300">{fmtK(used)}</span></span>
            <span className="font-semibold text-gray-700 dark:text-gray-300">{fmtK(monthly)} {locale === "ar" ? "توكن/شهر" : "tokens/mo"}</span>
          </div>
          <Progress value={pct} className={`h-2.5 rounded-full ${pct >= 90 ? "[&>div]:bg-red-500" : pct >= 70 ? "[&>div]:bg-amber-500" : "[&>div]:bg-purple-500"}`} />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white dark:bg-gray-800/60 rounded-xl p-3 text-center border border-gray-100 dark:border-gray-700">
            <p className="text-base font-bold text-gray-900 dark:text-white">{fmtK(used)}</p>
            <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">{ai.usedThisMonth}</p>
          </div>
          <div className="bg-white dark:bg-gray-800/60 rounded-xl p-3 text-center border border-gray-100 dark:border-gray-700">
            <p className="text-base font-bold text-green-600 dark:text-green-400">{fmtK(Math.max(0, monthly - used))}</p>
            <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">{ai.remainingPlan}</p>
          </div>
          <div className={`rounded-xl p-3 text-center border ${bonus > 0 ? "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800" : "bg-white dark:bg-gray-800/60 border-gray-100 dark:border-gray-700"}`}>
            <p className={`text-base font-bold ${bonus > 0 ? "text-purple-600 dark:text-purple-400" : "text-gray-300 dark:text-gray-600"}`}>
              {bonus > 0 ? fmtK(bonus) : "—"}
            </p>
            <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">{ai.bonusBalance}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Claude MCP Usage Card ───────────────────────────────────────────────────
function ClaudeMcpUsageCard({ data }: { data: DashboardData }) {
  const { locale } = useLanguage();
  const [activeTab, setActiveTab] = useState<"usage" | "buy">("usage");

  const plan = data.plan.plan as string;
  const isEnt = plan === "enterprise";
  const mcpLimit = (data.plan.limits as any).mcpCommandsPerMonth ?? 0;
  const mcpUsed = (data.plan as any).mcpCommandsUsedThisMonth ?? 0;
  const isUnlimitedMcp = mcpLimit === -1 || isEnt;
  const mcpPct = (!isUnlimitedMcp && mcpLimit > 0) ? Math.min(100, Math.round((mcpUsed / mcpLimit) * 100)) : 0;

  return (
    <Card className="border border-orange-200 dark:border-orange-900/40 shadow-sm bg-gradient-to-br from-orange-50/50 to-white dark:from-orange-950/10 dark:to-gray-900">
      <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4 sm:px-5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
            <Bot className="w-4 h-4 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <CardTitle className="text-sm font-bold text-gray-900 dark:text-white">Claude AI</CardTitle>
            <p className="text-[11px] text-gray-400">{locale === "ar" ? "يتجدد أول كل شهر" : "Resets monthly"}</p>
          </div>
        </div>
        {!isEnt && (
          <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-0.5 gap-0.5">
            {(["usage", "buy"] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition ${activeTab === tab ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm" : "text-gray-400 hover:text-gray-600"}`}>
                {tab === "usage" ? (locale === "ar" ? "الاستهلاك" : "Usage") : (locale === "ar" ? "ترقية" : "Upgrade")}
              </button>
            ))}
          </div>
        )}
      </CardHeader>

      <CardContent className="px-4 sm:px-5 pb-5">
        {activeTab === "usage" ? (
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                <span>{locale === "ar" ? "مستخدم" : "Used"}: <span className="font-semibold text-gray-700 dark:text-gray-200">{mcpUsed}</span></span>
                <span className="font-semibold text-gray-700 dark:text-gray-200">
                  {isUnlimitedMcp ? (locale === "ar" ? "غير محدود ∞" : "Unlimited ∞") : `${mcpLimit} ${locale === "ar" ? "أمر/شهر" : "cmds/mo"}`}
                </span>
              </div>
              {!isUnlimitedMcp && (
                <Progress value={mcpPct} className={`h-2 rounded-full ${mcpPct >= 90 ? "[&>div]:bg-red-500" : mcpPct >= 70 ? "[&>div]:bg-amber-500" : "[&>div]:bg-orange-500"}`} />
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-center">
                <p className="text-lg font-bold text-gray-900 dark:text-white">{mcpUsed}</p>
                <p className="text-[10px] text-gray-400">{locale === "ar" ? "مستخدم" : "Used"}</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-center">
                <p className="text-lg font-bold text-orange-500 dark:text-orange-400">{isUnlimitedMcp ? "∞" : Math.max(0, mcpLimit - mcpUsed)}</p>
                <p className="text-[10px] text-gray-400">{locale === "ar" ? "متبقي" : "Remaining"}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3 pt-1">
            <div className="bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-900/30 rounded-xl p-4 text-center">
              <p className="text-2xl font-black text-gray-900 dark:text-white">99<span className="text-sm font-medium text-gray-500 mr-1">{locale === "ar" ? " جنيه" : " EGP"}</span></p>
              <p className="text-sm font-semibold text-orange-600 dark:text-orange-400 mt-1">{locale === "ar" ? "Claude غير محدود ∞" : "Unlimited Claude ∞"}</p>
              <p className="text-xs text-gray-400 mt-1">{locale === "ar" ? "أوامر Claude غير محدودة لشهر كامل" : "Unlimited Claude commands for a month"}</p>
            </div>
            <button
              onClick={() => window.location.href = "/checkout?packageId=mcp_addon_unlimited"}
              className="w-full py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold transition active:scale-[.98] flex items-center justify-center gap-2 shadow-sm"
            >
              <Sparkles className="w-4 h-4" />
              {locale === "ar" ? "اشترِ أوامر غير محدودة — 99 ج/شهر" : "Buy Unlimited Commands — 99 EGP/mo"}
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Non-Enterprise WANI AI Upgrade Card ──────────────────────────────────────
function WaniAiUpgradeCard({ locale }: { locale: string }) {
  const { t } = useLanguage();
  const ai = t.home.ai;

  return (
    <Card className="border border-purple-100 dark:border-purple-900/40 shadow-sm bg-gradient-to-br from-purple-50 to-white dark:from-purple-950/20 dark:to-gray-900">
      <CardContent className="px-5 py-6 flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center flex-shrink-0">
            <Bot className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900 dark:text-white">{ai.upgradeCta}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">{ai.upgradeDesc}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-1.5">
          {(locale === "ar"
            ? ["ردود تلقائية بالذكاء الاصطناعي", "1 مليون توكن شهرياً", "يدعم ChatGPT و Gemini", "إمكانية شراء توكن إضافية"]
            : ["Automatic AI replies", "1M tokens per month", "ChatGPT & Gemini support", "Buy extra tokens anytime"]
          ).map((f, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
              <div className="w-4 h-4 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center flex-shrink-0">
                <svg className="w-2.5 h-2.5 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 10 8"><path d="M1 4l2.5 2.5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </div>
              {f}
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between pt-1">
          <div>
            <span className="text-xl font-bold text-gray-900 dark:text-white">{SUBSCRIPTION_PLANS.enterprise.monthly}</span>
            <span className="text-xs text-gray-500 dark:text-gray-400 mr-1">{locale === "ar" ? " جنيه/شهر" : " EGP/mo"}</span>
          </div>
          <button
            onClick={() => window.location.href = `/checkout?plan=enterprise`}
            className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold transition flex items-center gap-2 shadow-sm"
          >
            <Sparkles className="w-4 h-4" />
            {ai.upgradeBtn}
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Non-Pro/Ent Claude Upgrade Card ──────────────────────────────────────────
function ClaudeUpgradeCard({ locale }: { locale: string }) {
  return (
    <Card className="border border-[#25D366]/20 dark:border-[#25D366]/10 shadow-sm bg-gradient-to-br from-[#25D366]/5 to-white dark:from-[#25D366]/5 dark:to-gray-900">
      <CardContent className="px-5 py-5 flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#25D366]/10 flex items-center justify-center flex-shrink-0">
            <Bot className="w-5 h-5 text-[#25D366]" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-gray-900 dark:text-white">
              {locale === "ar" ? "🤖 تحكّم في وني بالكلام مع Claude" : "🤖 Control WANI by talking to Claude"}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
              {locale === "ar" ? "قول لـ Claude: اعمل حملة لعملائي — وهو يتنفذها تلقائياً." : "Tell Claude to create campaigns or reports — it executes automatically."}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {(locale === "ar"
            ? ["إنشاء حملات بأمر واحد", "تقارير فورية", "إدارة جهات الاتصال", "50 أمر/شهر في Pro"]
            : ["Create campaigns in one command", "Instant reports", "Manage contacts", "50 cmds/mo in Pro"]
          ).map((f, i) => (
            <div key={i} className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300">
              <div className="w-3.5 h-3.5 rounded-full bg-[#25D366]/15 flex items-center justify-center flex-shrink-0">
                <svg className="w-2 h-2 text-[#25D366]" fill="none" viewBox="0 0 10 8"><path d="M1 4l2.5 2.5L9 1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </div>
              {f}
            </div>
          ))}
        </div>
        <button
          onClick={() => window.location.href = "/checkout?plan=pro"}
          className="w-full py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20bb5a] text-white text-sm font-semibold transition flex items-center justify-center gap-2 shadow-sm active:scale-[.98]"
        >
          <Sparkles className="w-4 h-4" />
          {locale === "ar" ? "ترقّى وابدأ مع Claude" : "Upgrade to use Claude"}
        </button>
      </CardContent>
    </Card>
  );
}

// ─── Usage Page ───────────────────────────────────────────────────────────────
export default function UsagePage() {
  const { dashData, loadingDash } = useSubscription();
  const { locale, dir } = useLanguage();

  if (!dashData) {
    return loadingDash
      ? <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-gray-300" /></div>
      : null;
  }

  const isEnterprise = dashData.plan.plan === "enterprise";
  const plan = dashData.plan.plan as string;
  const isPro = plan === "pro";
  const isEnt = plan === "enterprise";
  const canClaude = isPro || isEnt;

  return (
    <div dir={dir} className="space-y-6">
      {/* ── Page Header ── */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-orange-500 flex items-center justify-center shadow-md">
          <BarChart3 className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
            {locale === "ar" ? "الاستهلاك والتوكنز" : "Usage & Tokens"}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {locale === "ar" ? "تتبع استهلاكك من توكنز الذكاء الاصطناعي" : "Track your AI token usage"}
          </p>
        </div>
      </div>

      {/* ── Plan Card ── */}
      <PlanCard plan={dashData.plan} />

      {/* ── Referral Program Card (🎁 ادعُ أصدقاءك واربح رصيدًا) ── */}
      <ReferralProgramCard
        isFreePlan={dashData.plan.plan === "free" || dashData.plan.status !== "active"}
        userPlan={dashData.plan.plan}
        locale={locale}
      />

      {/* ── WANI AI Token Card ── */}
      {isEnterprise ? (
        <EnterpriseTokenCard data={dashData} />
      ) : (
        <WaniAiUpgradeCard locale={locale} />
      )}

      {/* ── Claude MCP Card ── */}
      {canClaude ? (
        <ClaudeMcpUsageCard data={dashData} />
      ) : (
        <ClaudeUpgradeCard locale={locale} />
      )}
    </div>
  );
}
