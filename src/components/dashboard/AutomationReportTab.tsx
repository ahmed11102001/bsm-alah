"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  AlertCircle,
  ArrowRight,
  Bot,
  CheckCircle2,
  Clock3,
  Cpu,
  MessageSquare,
  ShieldAlert,
  Sparkles,
  TimerReset,
  ToggleLeft,
  TrendingUp,
  Zap,
} from "lucide-react";
import { useLanguage } from "@/lib/language-context";

interface AutomationRule {
  id: string;
  name: string;
  type: "AI Agent" | "Keyword Replies" | "Welcome Messages" | "Smart Follow-up" | "Scheduled Automations" | "Time-based Automations" | string;
  isEnabled: boolean;
  hasError?: boolean;
  runCount: number;
  successCount: number;
  failureCount: number;
  lastRun: string;
}

interface ErrorLogItem {
  id: string;
  title: string;
  details: string;
  time: string;
}

interface TimelineItem {
  time: string;
  title: string;
}

const labels = {
  ar: {
    kpis: "KPIs",
    total: "إجمالي الأتمتات",
    active: "الأتمتات النشطة",
    stopped: "الأتمتات المتوقفة",
    errors: "الأتمتات التي بها أخطاء",
    successRate: "معدل نجاح التنفيذ",
    runs: "إجمالي مرات التشغيل",
    automationPerf: "أداء الأتمتات",
    funnel: "Funnel لكل أتمتة",
    errorLog: "سجل الأخطاء",
    mostUsed: "أكثر الأتمتات استخدامًا",
    aiPerf: "أداء الذكاء الاصطناعي",
    timeSaved: "توفير الوقت",
    timeline: "Timeline",
    filterAll: "الكل",
    filterAi: "AI Agent",
    filterSmart: "Smart Follow-up",
    filterKeyword: "Keyword Replies",
    filterWelcome: "Welcome Messages",
    filterScheduled: "Scheduled Automations",
    filterTime: "Time-based Automations",
    filterActive: "النشطة",
    filterStopped: "المتوقفة",
    filterError: "بها أخطاء",
    viewDetails: "عرض التفاصيل",
    success: "نسبة النجاح",
    failure: "الفشل",
    lastRun: "آخر تشغيل",
    runsCount: "مرات التشغيل",
    avgResponse: "متوسط وقت الرد",
    fastest: "أسرع رد",
    slowest: "أبطأ رد",
    aiReplies: "عدد الرسائل التي رد عليها AI",
    handoffs: "عدد مرات التحويل للبشر",
  },
  en: {
    kpis: "KPIs",
    total: "Total Automations",
    active: "Active Automations",
    stopped: "Stopped Automations",
    errors: "Automations with Errors",
    successRate: "Execution Success Rate",
    runs: "Total Runs",
    automationPerf: "Automation Performance",
    funnel: "Funnel per Automation",
    errorLog: "Error Log",
    mostUsed: "Most Used Automations",
    aiPerf: "AI Performance",
    timeSaved: "Time Saved",
    timeline: "Timeline",
    filterAll: "All",
    filterAi: "AI Agent",
    filterSmart: "Smart Follow-up",
    filterKeyword: "Keyword Replies",
    filterWelcome: "Welcome Messages",
    filterScheduled: "Scheduled Automations",
    filterTime: "Time-based Automations",
    filterActive: "Active",
    filterStopped: "Stopped",
    filterError: "Has Errors",
    viewDetails: "View details",
    success: "Success rate",
    failure: "Failure",
    lastRun: "Last run",
    runsCount: "Runs",
    avgResponse: "Avg response time",
    fastest: "Fastest reply",
    slowest: "Slowest reply",
    aiReplies: "AI replies count",
    handoffs: "Human handoffs",
  },
} as const;

const mockRules: AutomationRule[] = [
  { id: "1", name: "AI Agent", type: "AI Agent", isEnabled: true, hasError: false, runCount: 812, successCount: 804, failureCount: 3, lastRun: "الآن" },
  { id: "2", name: "الرد بالكلمات المفتاحية", type: "Keyword Replies", isEnabled: true, hasError: false, runCount: 520, successCount: 504, failureCount: 14, lastRun: "منذ دقيقة" },
  { id: "3", name: "الترحيب التلقائي", type: "Welcome Messages", isEnabled: true, hasError: false, runCount: 430, successCount: 430, failureCount: 0, lastRun: "الآن" },
  { id: "4", name: "متابعة العميل", type: "Smart Follow-up", isEnabled: true, hasError: false, runCount: 286, successCount: 271, failureCount: 15, lastRun: "منذ 10 دقائق" },
  { id: "5", name: "رسائل مجدولة", type: "Scheduled Automations", isEnabled: false, hasError: true, runCount: 140, successCount: 120, failureCount: 20, lastRun: "منذ ساعة" },
  { id: "6", name: "أتمتة زمنية", type: "Time-based Automations", isEnabled: false, hasError: false, runCount: 98, successCount: 92, failureCount: 6, lastRun: "منذ 3 ساعات" },
];

const errorLogs: ErrorLogItem[] = [
  { id: "1", title: "WhatsApp Token Expired", details: "Refresh token and verify integration scopes.", time: "09:10" },
  { id: "2", title: "Template Rejected", details: "Template violated policy checks.", time: "08:42" },
  { id: "3", title: "Rate Limit Reached", details: "Retry after window reset or raise quota.", time: "08:12" },
  { id: "4", title: "AI Request Failed", details: "Gemini/OpenAI request timed out after retries.", time: "07:51" },
];

const topAutomations = [
  { name: "AI Agent", runs: 5200 },
  { name: "Keyword Replies", runs: 3100 },
  { name: "Smart Follow-up", runs: 2100 },
  { name: "Welcome Message", runs: 1700 },
];

const funnelSteps = ["تم تفعيل الأتمتة", "تم إرسال الرسالة", "تم فتح الرسالة", "رد العميل", "اكتملت المتابعة"];
const funnelData = [100, 86, 71, 46, 38];

const timeline: TimelineItem[] = [
  { time: "09:00", title: "تم تشغيل AI Agent" },
  { time: "09:01", title: "تم إرسال رسالة ترحيب" },
  { time: "09:03", title: "رد العميل" },
  { time: "09:04", title: "قام AI بالرد" },
  { time: "09:05", title: "تم إغلاق المحادثة" },
];

const aiMetrics = {
  avgResponseTime: "1.2s",
  fastestResponse: "0.4s",
  slowestResponse: "3.8s",
  aiRepliesCount: 6420,
  aiSuccessRate: 99,
  humanHandoffs: 184,
};

function StatCard({
  label,
  value,
  sub,
  icon,
  color,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <Card className="border border-gray-100 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800">
      <CardContent className="p-5 flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{label}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
          {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{sub}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>{icon}</div>
      </CardContent>
    </Card>
  );
}

function getSuccess(rule: AutomationRule) {
  return Math.round((rule.successCount / Math.max(rule.runCount, 1)) * 100);
}

function fmtRuns(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k` : String(n);
}

export default function AutomationReportTab() {
  const { locale } = useLanguage();
  const t = labels[locale as keyof typeof labels] ?? labels.en;
  const [selectedFilter, setSelectedFilter] = useState<string>("all");
  const [selectedError, setSelectedError] = useState<ErrorLogItem | null>(null);
  const rules = mockRules;

  const filteredRules = useMemo(() => {
    let data = [...rules];
    if (selectedFilter === "active") data = data.filter((r) => r.isEnabled);
    if (selectedFilter === "stopped") data = data.filter((r) => !r.isEnabled);
    if (selectedFilter === "error") data = data.filter((r) => r.hasError);
    if (selectedFilter !== "all" && !["active", "stopped", "error"].includes(selectedFilter)) data = data.filter((r) => r.type === selectedFilter);
    return data;
  }, [selectedFilter]);

  const totalRuns = rules.reduce((s, r) => s + r.runCount, 0);
  const totalSuccess = rules.reduce((s, r) => s + r.successCount, 0);
  const totalFailures = rules.reduce((s, r) => s + r.failureCount, 0);
  const totalErrors = rules.filter((r) => r.hasError).length;
  const activeRules = rules.filter((r) => r.isEnabled).length;
  const stoppedRules = rules.filter((r) => !r.isEnabled).length;
  const successRate = Math.round((totalSuccess / Math.max(totalRuns, 1)) * 100);

  const funnelForSelected = funnelData.map((v, i) => ({ step: funnelSteps[i], value: v }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        {[
          { key: "all", label: t.filterAll },
          { key: "AI Agent", label: t.filterAi },
          { key: "Smart Follow-up", label: t.filterSmart },
          { key: "Keyword Replies", label: t.filterKeyword },
          { key: "Welcome Messages", label: t.filterWelcome },
          { key: "Scheduled Automations", label: t.filterScheduled },
          { key: "Time-based Automations", label: t.filterTime },
          { key: "active", label: t.filterActive },
          { key: "stopped", label: t.filterStopped },
          { key: "error", label: t.filterError },
        ].map((item) => (
          <Button
            key={item.key}
            variant={selectedFilter === item.key ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedFilter(item.key)}
            className="rounded-full"
          >
            {item.label}
          </Button>
        ))}
      </div>

      <section>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">{t.kpis}</h2>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard label={t.total} value={rules.length} icon={<Zap className="w-5 h-5 text-yellow-600" />} color="bg-yellow-50 dark:bg-yellow-900/20" />
          <StatCard label={t.active} value={activeRules} icon={<CheckCircle2 className="w-5 h-5 text-green-600" />} color="bg-green-50 dark:bg-green-900/20" />
          <StatCard label={t.stopped} value={stoppedRules} icon={<ToggleLeft className="w-5 h-5 text-gray-500" />} color="bg-gray-50 dark:bg-gray-700/50" />
          <StatCard label={t.errors} value={totalErrors} icon={<AlertCircle className="w-5 h-5 text-red-500" />} color="bg-red-50 dark:bg-red-900/20" />
          <StatCard label={t.successRate} value={`${successRate}%`} sub={`${totalSuccess} successful / ${totalFailures} failed`} icon={<TrendingUp className="w-5 h-5 text-indigo-500" />} color="bg-indigo-50 dark:bg-indigo-900/20" />
          <StatCard label={t.runs} value={fmtRuns(totalRuns)} icon={<TimerReset className="w-5 h-5 text-blue-500" />} color="bg-blue-50 dark:bg-blue-900/20" />
        </div>
      </section>

      <section>
        <Card className="border border-gray-100 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800">
          <CardHeader className="pb-2"><CardTitle className="text-base font-semibold text-gray-900 dark:text-gray-100">{t.automationPerf}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-12 text-xs font-medium text-gray-500 dark:text-gray-400 px-1">
              <div className="col-span-3">الأتمتة</div>
              <div className="col-span-2">النوع</div>
              <div className="col-span-2">مرات التشغيل</div>
              <div className="col-span-2">نسبة النجاح</div>
              <div className="col-span-1">الفشل</div>
              <div className="col-span-2">آخر تشغيل</div>
            </div>

            {filteredRules.map((rule) => {
              const s = getSuccess(rule);
              return (
                <div key={rule.id} className="grid grid-cols-12 items-center gap-3 p-4 rounded-2xl bg-gray-50 dark:bg-gray-700/40">
                  <div className="col-span-3 font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <Bot className="w-4 h-4 text-purple-500" />
                    {rule.name}
                  </div>
                  <div className="col-span-2 text-sm text-gray-600 dark:text-gray-300">{rule.type}</div>
                  <div className="col-span-2 text-sm font-semibold text-gray-900 dark:text-gray-100">{fmtRuns(rule.runCount)}</div>
                  <div className="col-span-2">
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                      <span>{s}%</span>
                      <span>{t.success}</span>
                    </div>
                    <Progress value={s} className="h-2" />
                  </div>
                  <div className="col-span-1 text-sm font-semibold text-red-500">{rule.failureCount}</div>
                  <div className="col-span-2 text-sm text-gray-600 dark:text-gray-300">{rule.lastRun}</div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </section>

      <section>
        <Card className="border border-gray-100 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800">
          <CardHeader className="pb-2"><CardTitle className="text-base font-semibold text-gray-900 dark:text-gray-100">{t.funnel}</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4">
              {funnelForSelected.map((item, idx) => (
                <div key={item.step} className="flex items-center gap-4">
                  <div className="w-56 text-sm text-gray-700 dark:text-gray-200">{item.step}</div>
                  <div className="flex-1"><Progress value={item.value} className="h-3" /></div>
                  <div className="w-12 text-sm font-semibold text-gray-900 dark:text-gray-100">{item.value}%</div>
                  {idx < funnelForSelected.length - 1 && <ArrowRight className="w-4 h-4 text-gray-400" />}
                </div>
              ))}
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Smart Follow-up يوضح فين المستخدمين بيخرجوا من الـ flow حسب انخفاض النسبة بين كل مرحلة والتالية.
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section>
        <Card className="border border-gray-100 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800">
          <CardHeader className="pb-2"><CardTitle className="text-base font-semibold text-gray-900 dark:text-gray-100">{t.errorLog}</CardTitle></CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-4">
            <div className="space-y-3">
              {errorLogs.map((err) => (
                <button
                  key={err.id}
                  onClick={() => setSelectedError(err)}
                  className={`w-full text-left p-4 rounded-2xl border transition ${
                    selectedError?.id === err.id
                      ? "border-red-300 bg-red-50 dark:bg-red-900/20"
                      : "border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/40"
                  }`}
                >
                  <div className="flex items-center gap-2 text-red-600 font-semibold">
                    <ShieldAlert className="w-4 h-4" />❌ {err.title}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">{err.time}</div>
                </button>
              ))}
            </div>

            <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-700/40 min-h-[220px]">
              {selectedError ? (
                <>
                  <div className="flex items-center gap-2 text-gray-900 dark:text-gray-100 font-semibold mb-2">
                    <AlertCircle className="w-4 h-4 text-red-500" />
                    {selectedError.title}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{selectedError.details}</p>
                  <div className="mt-4 text-xs text-gray-500">{t.viewDetails}</div>
                </>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">اضغط على أي خطأ لمعرفة التفاصيل.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </section>

      <section>
        <Card className="border border-gray-100 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800">
          <CardHeader className="pb-2"><CardTitle className="text-base font-semibold text-gray-900 dark:text-gray-100">{t.mostUsed}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {topAutomations.map((item, index) => (
              <div key={item.name} className="flex items-center gap-4">
                <div className="w-6 text-sm font-bold text-gray-500">{index + 1}</div>
                <div className="flex-1">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-gray-900 dark:text-gray-100">{item.name}</span>
                    <span className="text-gray-500">{fmtRuns(item.runs)} تشغيل</span>
                  </div>
                  <Progress value={(item.runs / 5200) * 100} className="h-2" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="grid lg:grid-cols-2 gap-6">
        <Card className="border border-gray-100 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800">
          <CardHeader className="pb-2"><CardTitle className="text-base font-semibold text-gray-900 dark:text-gray-100">{t.aiPerf}</CardTitle></CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-4">
            <StatCard label={t.avgResponse} value={aiMetrics.avgResponseTime} icon={<Clock3 className="w-5 h-5 text-orange-500" />} color="bg-orange-50 dark:bg-orange-900/20" />
            <StatCard label={t.fastest} value={aiMetrics.fastestResponse} icon={<Sparkles className="w-5 h-5 text-emerald-500" />} color="bg-emerald-50 dark:bg-emerald-900/20" />
            <StatCard label={t.slowest} value={aiMetrics.slowestResponse} icon={<Cpu className="w-5 h-5 text-blue-500" />} color="bg-blue-50 dark:bg-blue-900/20" />
            <StatCard label={t.handoffs} value={fmtRuns(aiMetrics.humanHandoffs)} icon={<MessageSquare className="w-5 h-5 text-indigo-500" />} color="bg-indigo-50 dark:bg-indigo-900/20" />
            <StatCard label={t.aiReplies} value={fmtRuns(aiMetrics.aiRepliesCount)} icon={<Bot className="w-5 h-5 text-purple-500" />} color="bg-purple-50 dark:bg-purple-900/20" />
            <StatCard label={t.successRate} value={`${aiMetrics.aiSuccessRate}%`} icon={<CheckCircle2 className="w-5 h-5 text-green-600" />} color="bg-green-50 dark:bg-green-900/20" />
          </CardContent>
        </Card>

        <Card className="border border-gray-100 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800">
          <CardHeader className="pb-2"><CardTitle className="text-base font-semibold text-gray-900 dark:text-gray-100">{t.timeSaved}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 p-5 text-white">
              <div className="text-sm opacity-90">تم توفير</div>
              <div className="text-4xl font-bold mt-1">83 ساعة</div>
              <div className="text-sm opacity-90 mt-1">قام الذكاء الاصطناعي بالرد على 6,420 رسالة</div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-700/40">
                <div className="text-sm text-gray-500">تم تنفيذ</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">9,800</div>
                <div className="text-xs text-gray-400">عملية تلقائيًا</div>
              </div>
              <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-700/40">
                <div className="text-sm text-gray-500">توفير تقديري</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">+27%</div>
                <div className="text-xs text-gray-400">في وقت فريق الدعم</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section>
        <Card className="border border-gray-100 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800">
          <CardHeader className="pb-2"><CardTitle className="text-base font-semibold text-gray-900 dark:text-gray-100">{t.timeline}</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4">
              {timeline.map((item, idx) => (
                <div key={item.time} className="flex items-start gap-4">
                  <div className="w-14 text-sm font-semibold text-gray-500">{item.time}</div>
                  <div className="relative">
                    <div className="w-3 h-3 rounded-full bg-blue-500 mt-1" />
                    {idx < timeline.length - 1 && <div className="absolute left-1.5 top-4 w-px h-12 bg-gray-200 dark:bg-gray-700" />}
                  </div>
                  <div className="text-sm text-gray-800 dark:text-gray-100">{item.title}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}