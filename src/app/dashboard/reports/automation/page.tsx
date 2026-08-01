"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
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
  Loader2,
  MessageSquare,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  TimerReset,
  ToggleLeft,
  TrendingUp,
  Zap,
} from "lucide-react";
import { useLanguage } from "@/lib/language-context";

// ─── Types (match API response) ──────────────────────────────────────────────
interface AutomationRule {
  id: string;
  name: string;
  type: string;
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

interface AIMetrics {
  avgResponseTime: string;
  fastestResponse: string;
  slowestResponse: string;
  aiRepliesCount: number;
  aiSuccessRate: number;
  humanHandoffs: number;
}

interface TimeSaved {
  totalAutoReplies: number;
  estimatedHoursSaved: number;
  efficiencyGain: number;
}

interface FunnelData {
  steps: string[];
  values: number[];
}

interface AutomationReportData {
  kpis: {
    totalAutomations: number;
    activeAutomations: number;
    stoppedAutomations: number;
    automationsWithErrors: number;
    totalRuns: number;
    totalSuccess: number;
    totalFailures: number;
    successRate: number;
  };
  rules: AutomationRule[];
  errorLog: ErrorLogItem[];
  topAutomations: { name: string; runs: number }[];
  aiMetrics: AIMetrics;
  timeSaved: TimeSaved;
  timeline: TimelineItem[];
  funnel: FunnelData;
}

// ─── Labels ──────────────────────────────────────────────────────────────────
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
    filterStore: "Store Automation",
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
    loading: "جاري تحميل البيانات...",
    noData: "لا توجد بيانات أتمتة بعد",
    refresh: "تحديث",
    errorFetch: "حدث خطأ في تحميل البيانات",
    saved: "تم توفير",
    hours: "ساعة",
    aiRepliedTo: "قام الذكاء الاصطناعي بالرد على",
    message: "رسالة",
    executed: "تم تنفيذ",
    autoProcess: "عملية تلقائيًا",
    estimatedSaving: "توفير تقديري",
    inSupportTime: "في وقت فريق الدعم",
    noErrors: "لا توجد أخطاء",
    clickError: "اضغط على أي خطأ لمعرفة التفاصيل.",
    runs_label: "تشغيل",
    funnelHint: "يوضح فين المستخدمين بيخرجوا من الـ flow حسب انخفاض النسبة بين كل مرحلة والتالية.",
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
    filterStore: "Store Automation",
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
    loading: "Loading data...",
    noData: "No automation data yet",
    refresh: "Refresh",
    errorFetch: "Error loading data",
    saved: "Saved",
    hours: "hours",
    aiRepliedTo: "AI replied to",
    message: "messages",
    executed: "Executed",
    autoProcess: "processes automatically",
    estimatedSaving: "Estimated saving",
    inSupportTime: "in support team time",
    noErrors: "No errors",
    clickError: "Click any error to see details.",
    runs_label: "runs",
    funnelHint: "Shows where users drop off from the automation flow by the percentage decrease between each stage.",
  },
} as const;

// ─── Sub-components ──────────────────────────────────────────────────────────
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

// ─── Main Component ──────────────────────────────────────────────────────────
export default function AutomationReportTab() {
  const { locale } = useLanguage();
  const t = labels[locale as keyof typeof labels] ?? labels.en;

  const [data, setData] = useState<AutomationReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedError, setSelectedError] = useState<ErrorLogItem | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/reports/automation");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      console.error("AutomationReportTab fetch error:", err);
      setError(err.message ?? t.errorFetch);
    } finally {
      setLoading(false);
    }
  }, [t.errorFetch]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const rules = data?.rules ?? [];

  const filteredRules = useMemo(() => {
    return [...rules];
  }, [rules]);

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <p className="text-sm text-gray-500">{t.loading}</p>
      </div>
    );
  }

  // ── Error state ────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <AlertCircle className="w-8 h-8 text-red-500" />
        <p className="text-sm text-red-500">{t.errorFetch}</p>
        <Button variant="outline" size="sm" onClick={fetchData}>
          <RefreshCw className="w-4 h-4 mr-2" />
          {t.refresh}
        </Button>
      </div>
    );
  }

  if (!data) return null;

  const { kpis, errorLog, topAutomations, aiMetrics, timeSaved, timeline, funnel } = data;
  const maxTopRuns = topAutomations[0]?.runs ?? 1;

  return (
    <div className="space-y-6">
      {/* ── Filters + Refresh ───────────────────────────────────────────────── */}
      <div className="flex items-center justify-end">
        <Button variant="ghost" size="sm" onClick={fetchData}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* ── KPIs ────────────────────────────────────────────────────────────── */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">{t.kpis}</h2>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard label={t.total} value={kpis.totalAutomations} icon={<Zap className="w-5 h-5 text-yellow-600" />} color="bg-yellow-50 dark:bg-yellow-900/20" />
          <StatCard label={t.active} value={kpis.activeAutomations} icon={<CheckCircle2 className="w-5 h-5 text-green-600" />} color="bg-green-50 dark:bg-green-900/20" />
          <StatCard label={t.stopped} value={kpis.stoppedAutomations} icon={<ToggleLeft className="w-5 h-5 text-gray-500" />} color="bg-gray-50 dark:bg-gray-700/50" />
          <StatCard label={t.errors} value={kpis.automationsWithErrors} icon={<AlertCircle className="w-5 h-5 text-red-500" />} color="bg-red-50 dark:bg-red-900/20" />
          <StatCard label={t.successRate} value={`${kpis.successRate}%`} sub={`${kpis.totalSuccess} successful / ${kpis.totalFailures} failed`} icon={<TrendingUp className="w-5 h-5 text-indigo-500" />} color="bg-indigo-50 dark:bg-indigo-900/20" />
          <StatCard label={t.runs} value={fmtRuns(kpis.totalRuns)} icon={<TimerReset className="w-5 h-5 text-blue-500" />} color="bg-blue-50 dark:bg-blue-900/20" />
        </div>
      </section>

      {/* ── Automation Performance Table ─────────────────────────────────────── */}
      <section>
        <Card className="border border-gray-100 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800">
          <CardHeader className="pb-2"><CardTitle className="text-base font-semibold text-gray-900 dark:text-gray-100">{t.automationPerf}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {filteredRules.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">{t.noData}</p>
            ) : (
              <>
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
              </>
            )}
          </CardContent>
        </Card>
      </section>

      {/* ── Funnel ──────────────────────────────────────────────────────────── */}
      <section>
        <Card className="border border-gray-100 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800">
          <CardHeader className="pb-2"><CardTitle className="text-base font-semibold text-gray-900 dark:text-gray-100">{t.funnel}</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4">
              {funnel.steps.map((step, idx) => (
                <div key={step} className="flex items-center gap-4">
                  <div className="w-56 text-sm text-gray-700 dark:text-gray-200">{step}</div>
                  <div className="flex-1"><Progress value={funnel.values[idx]} className="h-3" /></div>
                  <div className="w-12 text-sm font-semibold text-gray-900 dark:text-gray-100">{funnel.values[idx]}%</div>
                  {idx < funnel.steps.length - 1 && <ArrowRight className="w-4 h-4 text-gray-400" />}
                </div>
              ))}
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {t.funnelHint}
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ── Error Log ───────────────────────────────────────────────────────── */}
      <section>
        <Card className="border border-gray-100 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800">
          <CardHeader className="pb-2"><CardTitle className="text-base font-semibold text-gray-900 dark:text-gray-100">{t.errorLog}</CardTitle></CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-4">
            <div className="space-y-3">
              {errorLog.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">{t.noErrors}</p>
              ) : (
                errorLog.map((err) => (
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
                ))
              )}
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
                <p className="text-sm text-gray-500 dark:text-gray-400">{t.clickError}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ── Most Used Automations ────────────────────────────────────────────── */}
      <section>
        <Card className="border border-gray-100 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800">
          <CardHeader className="pb-2"><CardTitle className="text-base font-semibold text-gray-900 dark:text-gray-100">{t.mostUsed}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {topAutomations.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">{t.noData}</p>
            ) : (
              topAutomations.map((item, index) => (
                <div key={item.name} className="flex items-center gap-4">
                  <div className="w-6 text-sm font-bold text-gray-500">{index + 1}</div>
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-gray-900 dark:text-gray-100">{item.name}</span>
                      <span className="text-gray-500">{fmtRuns(item.runs)} {t.runs_label}</span>
                    </div>
                    <Progress value={(item.runs / maxTopRuns) * 100} className="h-2" />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>

      {/* ── AI Performance + Time Saved ──────────────────────────────────────── */}
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
              <div className="text-sm opacity-90">{t.saved}</div>
              <div className="text-4xl font-bold mt-1">{timeSaved.estimatedHoursSaved} {t.hours}</div>
              <div className="text-sm opacity-90 mt-1">{t.aiRepliedTo} {fmtRuns(timeSaved.totalAutoReplies)} {t.message}</div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-700/40">
                <div className="text-sm text-gray-500">{t.executed}</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{fmtRuns(timeSaved.totalAutoReplies)}</div>
                <div className="text-xs text-gray-400">{t.autoProcess}</div>
              </div>
              <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-700/40">
                <div className="text-sm text-gray-500">{t.estimatedSaving}</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">+{timeSaved.efficiencyGain}%</div>
                <div className="text-xs text-gray-400">{t.inSupportTime}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ── Timeline ────────────────────────────────────────────────────────── */}
      <section>
        <Card className="border border-gray-100 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800">
          <CardHeader className="pb-2"><CardTitle className="text-base font-semibold text-gray-900 dark:text-gray-100">{t.timeline}</CardTitle></CardHeader>
          <CardContent>
            {timeline.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">{t.noData}</p>
            ) : (
              <div className="space-y-4">
                {timeline.map((item, idx) => (
                  <div key={`${item.time}-${idx}`} className="flex items-start gap-4">
                    <div className="w-14 text-sm font-semibold text-gray-500">{item.time}</div>
                    <div className="relative">
                      <div className="w-3 h-3 rounded-full bg-blue-500 mt-1" />
                      {idx < timeline.length - 1 && <div className="absolute left-1.5 top-4 w-px h-12 bg-gray-200 dark:bg-gray-700" />}
                    </div>
                    <div className="text-sm text-gray-800 dark:text-gray-100">{item.title}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}