"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Loader2, Zap, Bot, ToggleLeft, ToggleRight,
  CheckCircle, XCircle, Cpu, Clock, MessageSquare,
} from "lucide-react";

interface AutomationRule {
  id: string;
  name: string;
  isEnabled: boolean;
  triggerType: string;
  triggerValue?: string | null;
  replyType: string;
  pauseOnReply?: boolean;
  createdAt: string;
}

interface AIAgentData {
  isEnabled: boolean;
  provider: "gemini" | "openai" | string;
  brandName: string;
  tone: string;
  pauseMinutes: number;
  elevenLabsEnabled?: boolean;
}

function countBy<T>(arr: T[], key: keyof T) {
  return arr.reduce<Record<string, number>>((acc, item) => {
    const val = String(item[key]);
    acc[val] = (acc[val] ?? 0) + 1;
    return acc;
  }, {});
}

function StatCard({
  label, value, sub, icon, color,
}: {
  label: string; value: string | number; sub?: string;
  icon: React.ReactNode; color: string;
}) {
  return (
    <Card className="border border-gray-100 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800">
      <CardContent className="p-5 flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{label}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
          {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{sub}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}

const triggerLabel: Record<string, string> = {
  KEYWORD: "كلمة مفتاحية",
  FIRST_MESSAGE: "أول رسالة",
  NO_REPLY: "عدم الرد",
  TIME_BASED: "مجدول زمني",
};

const replyLabel: Record<string, string> = {
  AI: "ذكاء اصطناعي",
  TEXT: "نص",
  TEMPLATE: "قالب",
};

const toneLabel: Record<string, string> = {
  friendly: "ودود",
  formal: "رسمي",
  egyptian: "عامية مصرية",
};

export default function AutomationReportTab() {
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [agent, setAgent] = useState<AIAgentData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [rulesRes, agentRes] = await Promise.all([
          fetch("/api/automation"),
          fetch("/api/ai-agent"),
        ]);
        if (rulesRes.ok) setRules(await rulesRes.json());
        if (agentRes.ok) setAgent(await agentRes.json());
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-10 h-10 animate-spin text-green-400" />
      </div>
    );
  }

  const totalRules = rules.length;
  const activeRules = rules.filter((r) => r.isEnabled).length;
  const aiRules = rules.filter((r) => r.replyType === "AI").length;
  const byTrigger = countBy(rules, "triggerType");
  const byReplyType = countBy(rules, "replyType");

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="إجمالي قواعد الأتمتة" value={totalRules} icon={<Zap className="w-5 h-5 text-yellow-600" />} color="bg-yellow-50 dark:bg-yellow-900/20" />
        <StatCard label="قواعد نشطة" value={activeRules} sub={totalRules > 0 ? `${Math.round((activeRules / totalRules) * 100)}% من الإجمالي` : undefined} icon={<CheckCircle className="w-5 h-5 text-green-600" />} color="bg-green-50 dark:bg-green-900/20" />
        <StatCard label="قواعد معطلة" value={totalRules - activeRules} icon={<XCircle className="w-5 h-5 text-red-500" />} color="bg-red-50 dark:bg-red-900/20" />
        <StatCard label="قواعد ذكاء اصطناعي" value={aiRules} sub="تعتمد على AI للرد" icon={<Bot className="w-5 h-5 text-purple-600" />} color="bg-purple-50 dark:bg-purple-900/20" />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="border border-gray-100 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800">
          <CardHeader className="pb-2"><CardTitle className="text-base font-semibold text-gray-900 dark:text-gray-100">توزيع المُشغِّلات</CardTitle></CardHeader>
          <CardContent>
            {totalRules === 0 ? <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">لا توجد قواعد</p> : (
              <div className="space-y-3">
                {Object.entries(byTrigger).map(([type, count]) => {
                  const pct = Math.round((count / totalRules) * 100);
                  return (
                    <div key={type} className="flex items-center gap-3">
                      <span className="text-sm text-gray-600 dark:text-gray-300 w-36 flex-shrink-0">{triggerLabel[type] ?? type}</span>
                      <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden"><div className="h-full bg-yellow-400 rounded-full" style={{ width: `${pct}%` }} /></div>
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-200 w-8 text-left">{count}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border border-gray-100 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800">
          <CardHeader className="pb-2"><CardTitle className="text-base font-semibold text-gray-900 dark:text-gray-100">أنواع الردود</CardTitle></CardHeader>
          <CardContent>
            {totalRules === 0 ? <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">لا توجد قواعد</p> : (
              <div className="space-y-3">
                {Object.entries(byReplyType).map(([type, count]) => {
                  const pct = Math.round((count / totalRules) * 100);
                  const colors: Record<string, string> = { AI: "bg-purple-400", TEXT: "bg-blue-400", TEMPLATE: "bg-green-400" };
                  return (
                    <div key={type} className="flex items-center gap-3">
                      <span className="text-sm text-gray-600 dark:text-gray-300 w-36 flex-shrink-0">{replyLabel[type] ?? type}</span>
                      <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${colors[type] ?? "bg-gray-400"}`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-200 w-8 text-left">{count}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border border-gray-100 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2"><Bot className="w-5 h-5 text-purple-500" />إعدادات الذكاء الاصطناعي</CardTitle>
        </CardHeader>
        <CardContent>
          {!agent ? <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">لا توجد بيانات</p> : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50">
                {agent.isEnabled ? <ToggleRight className="w-6 h-6 text-green-500 flex-shrink-0" /> : <ToggleLeft className="w-6 h-6 text-gray-400 flex-shrink-0" />}
                <div><p className="text-xs text-gray-500 dark:text-gray-400">الحالة</p><p className={`text-sm font-semibold ${agent.isEnabled ? "text-green-600" : "text-gray-500 dark:text-gray-300"}`}>{agent.isEnabled ? "مفعّل" : "معطّل"}</p></div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50">
                <Cpu className="w-6 h-6 text-blue-500 flex-shrink-0" />
                <div><p className="text-xs text-gray-500 dark:text-gray-400">المزود</p><p className="text-sm font-semibold text-gray-800 dark:text-gray-100 capitalize">{agent.provider === "gemini" ? "Google Gemini" : "OpenAI"}</p></div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50">
                <MessageSquare className="w-6 h-6 text-teal-500 flex-shrink-0" />
                <div><p className="text-xs text-gray-500 dark:text-gray-400">البراند</p><p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate max-w-[150px]">{agent.brandName || "—"}</p></div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50">
                <Zap className="w-6 h-6 text-yellow-500 flex-shrink-0" />
                <div><p className="text-xs text-gray-500 dark:text-gray-400">أسلوب الرد</p><p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{toneLabel[agent.tone] ?? agent.tone}</p></div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50">
                <Clock className="w-6 h-6 text-orange-500 flex-shrink-0" />
                <div><p className="text-xs text-gray-500 dark:text-gray-400">إيقاف مؤقت بعد رد بشري</p><p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{agent.pauseMinutes} دقيقة</p></div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50">
                <Bot className="w-6 h-6 text-indigo-500 flex-shrink-0" />
                <div><p className="text-xs text-gray-500 dark:text-gray-400">ردود صوتية (ElevenLabs)</p><p className={`text-sm font-semibold ${agent.elevenLabsEnabled ? "text-green-600" : "text-gray-400 dark:text-gray-300"}`}>{agent.elevenLabsEnabled ? "مفعّل" : "معطّل"}</p></div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
