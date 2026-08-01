"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  DollarSign, Loader2, TrendingUp, Send,
  LayoutTemplate, Megaphone, Info,
} from "lucide-react";

// ─── Egypt WhatsApp Conversation Pricing (USD) ───────────────────────────────
// المصدر: Meta Business Help Center — أسعار تقديرية
const EG_PRICES: Record<string, number> = {
  MARKETING:      0.0125,
  UTILITY:        0.0040,
  AUTHENTICATION: 0.0175,
  SERVICE:        0.0000,
};

const CATEGORY_COLOR: Record<string, string> = {
  MARKETING:      "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300",
  UTILITY:        "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
  AUTHENTICATION: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300",
  SERVICE:        "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300",
};

function estimateCost(count: number, category: string): number {
  const price = EG_PRICES[category?.toUpperCase()] ?? EG_PRICES.MARKETING;
  return count * price;
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface CampaignCostRow {
  id:          string;
  name:        string;
  sentCount:   number;
  status:      string;
  createdAt:   string;
  templateName: string | null;
  category:    string;
  cost:        number;
}

interface TemplateCostRow {
  templateName: string;
  category:     string;
  timesUsed:    number;
  totalSent:    number;
  cost:         number;
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, icon, color }: {
  label: string; value: string; sub?: string;
  icon: React.ReactNode; color: string;
}) {
  return (
    <Card className={`${color} border-0 shadow-sm`}>
      <CardContent className="p-4 flex items-start gap-3">
        <div className="mt-0.5 flex-shrink-0">{icon}</div>
        <div>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{label}</p>
          {sub && <p className="text-[11px] text-gray-500 dark:text-gray-500 mt-0.5">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function CostReportTab() {
  const [campaigns, setCampaigns] = useState<CampaignCostRow[]>([]);
  const [loading,   setLoading]   = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // جيب الحملات مع template category
      const res  = await fetch("/api/campaigns?limit=100");
      const data = await res.json();
      const list = Array.isArray(data) ? data : (data.campaigns ?? []);

      const rows: CampaignCostRow[] = list
        .filter((c: any) => c.sentCount > 0)
        .map((c: any) => {
          const category = c.template?.category ?? "MARKETING";
          return {
            id:           c.id,
            name:         c.name,
            sentCount:    c.sentCount,
            status:       c.status,
            createdAt:    c.createdAt,
            templateName: c.template?.name ?? null,
            category,
            cost:         estimateCost(c.sentCount, category),
          };
        })
        .sort((a: CampaignCostRow, b: CampaignCostRow) => b.cost - a.cost);

      setCampaigns(rows);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Aggregate by template ──────────────────────────────────────────────────
  const templateRows: TemplateCostRow[] = Object.values(
    campaigns.reduce((acc: Record<string, TemplateCostRow>, c) => {
      const key = c.templateName ?? "—";
      if (!acc[key]) acc[key] = { templateName: key, category: c.category, timesUsed: 0, totalSent: 0, cost: 0 };
      acc[key].timesUsed += 1;
      acc[key].totalSent += c.sentCount;
      acc[key].cost      += c.cost;
      return acc;
    }, {})
  ).sort((a, b) => b.cost - a.cost);

  // ── Summary numbers ────────────────────────────────────────────────────────
  const totalCost    = campaigns.reduce((s, c) => s + c.cost, 0);
  const totalSent    = campaigns.reduce((s, c) => s + c.sentCount, 0);
  const avgPerCamp   = campaigns.length ? totalCost / campaigns.length : 0;
  const maxCost      = campaigns[0]?.cost ?? 0;

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
      </div>
    );
  }

  if (campaigns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center mb-4">
          <DollarSign className="w-8 h-8 text-amber-400" />
        </div>
        <p className="text-gray-500 dark:text-gray-400 text-sm">لا توجد حملات مرسلة بعد</p>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">

      {/* ── Disclaimer ─────────────────────────────────────────────────────── */}
      <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-xl px-4 py-3 text-xs text-amber-700 dark:text-amber-400">
        <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <span>
          الأرقام تقديرية بناءً على أسعار Meta للأرقام المصرية (+20).
          للأسعار الدقيقة راجع <strong>Meta Business Manager</strong>.
        </span>
      </div>

      {/* ── Summary Cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="إجمالي الإنفاق التقديري"
          value={`~$${totalCost.toFixed(2)}`}
          sub={`${campaigns.length} حملة`}
          icon={<DollarSign className="w-5 h-5 text-amber-600" />}
          color="bg-amber-50 dark:bg-amber-900/20"
        />
        <StatCard
          label="إجمالي الرسائل المرسلة"
          value={totalSent.toLocaleString("ar-EG")}
          icon={<Send className="w-5 h-5 text-blue-600" />}
          color="bg-blue-50 dark:bg-blue-900/20"
        />
        <StatCard
          label="متوسط تكلفة الحملة"
          value={`~$${avgPerCamp.toFixed(2)}`}
          icon={<TrendingUp className="w-5 h-5 text-green-600" />}
          color="bg-green-50 dark:bg-green-900/20"
        />
        <StatCard
          label="أغلى حملة"
          value={`~$${maxCost.toFixed(2)}`}
          sub={campaigns[0]?.name ?? ""}
          icon={<Megaphone className="w-5 h-5 text-purple-600" />}
          color="bg-purple-50 dark:bg-purple-900/20"
        />
      </div>

      {/* ── Template Cost Breakdown ─────────────────────────────────────────── */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-3">
          <LayoutTemplate className="w-4 h-4 text-gray-400" />
          تكلفة القوالب
        </h3>
        <div className="rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800 text-xs text-gray-500 dark:text-gray-400">
                <th className="text-right px-4 py-3 font-medium">القالب</th>
                <th className="text-center px-4 py-3 font-medium">الكاتيجوري</th>
                <th className="text-center px-4 py-3 font-medium">استُخدم</th>
                <th className="text-center px-4 py-3 font-medium">رسائل</th>
                <th className="text-center px-4 py-3 font-medium">السعر / رسالة</th>
                <th className="text-left px-4 py-3 font-medium">التكلفة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
              {templateRows.map((row) => {
                const pricePerMsg = EG_PRICES[row.category?.toUpperCase()] ?? EG_PRICES.MARKETING;
                return (
                  <tr key={row.templateName} className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition">
                    <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200 truncate max-w-[160px]">
                      {row.templateName}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${CATEGORY_COLOR[row.category?.toUpperCase()] ?? CATEGORY_COLOR.MARKETING}`}>
                        {row.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-400">{row.timesUsed}×</td>
                    <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-400">{row.totalSent.toLocaleString("ar-EG")}</td>
                    <td className="px-4 py-3 text-center text-gray-500 dark:text-gray-400 font-mono text-xs">${pricePerMsg.toFixed(4)}</td>
                    <td className="px-4 py-3 text-left font-bold text-amber-700 dark:text-amber-400">~${row.cost.toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Campaign Cost Breakdown ─────────────────────────────────────────── */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-3">
          <Megaphone className="w-4 h-4 text-gray-400" />
          تكلفة الحملات
        </h3>
        <div className="rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800 text-xs text-gray-500 dark:text-gray-400">
                <th className="text-right px-4 py-3 font-medium">الحملة</th>
                <th className="text-center px-4 py-3 font-medium">القالب</th>
                <th className="text-center px-4 py-3 font-medium">الكاتيجوري</th>
                <th className="text-center px-4 py-3 font-medium">مرسل</th>
                <th className="text-left px-4 py-3 font-medium">التكلفة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
              {campaigns.map((c) => (
                <tr key={c.id} className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800 dark:text-gray-200 truncate max-w-[150px]">{c.name}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {new Date(c.createdAt).toLocaleDateString("ar-EG")}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-center text-gray-500 dark:text-gray-400 text-xs truncate max-w-[120px]">
                    {c.templateName ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${CATEGORY_COLOR[c.category?.toUpperCase()] ?? CATEGORY_COLOR.MARKETING}`}>
                      {c.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-400">
                    {c.sentCount.toLocaleString("ar-EG")}
                  </td>
                  <td className="px-4 py-3 text-left font-bold text-amber-700 dark:text-amber-400">
                    ~${c.cost.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-amber-50 dark:bg-amber-900/20 border-t-2 border-amber-200 dark:border-amber-800/40">
                <td colSpan={3} className="px-4 py-3 text-sm font-semibold text-amber-800 dark:text-amber-300">الإجمالي</td>
                <td className="px-4 py-3 text-center font-semibold text-amber-800 dark:text-amber-300">
                  {totalSent.toLocaleString("ar-EG")}
                </td>
                <td className="px-4 py-3 text-left font-bold text-amber-700 dark:text-amber-400 text-base">
                  ~${totalCost.toFixed(2)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

    </div>
  );
}