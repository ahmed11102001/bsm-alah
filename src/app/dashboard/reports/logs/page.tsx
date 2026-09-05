"use client";
import { TableRowsSkeleton } from "@/components/dashboard/DashboardSkeletons";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ChevronLeft, ChevronRight, Loader2, RefreshCw, FileSpreadsheet,
} from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import {
  type LogsData, TODAY, MONTH_AGO, pageText, statusColor,
  formatDate, formatNumber, getStatusLabel, getDirLabel, getTypeLabel, exportExcel,
} from "../_shared";

export default function ReportsLogsPage() {
  const { locale } = useLanguage();
  const numberLocale = locale === "ar" ? "ar-EG" : "en-US";
  const dateLocale = locale === "ar" ? "ar-EG" : "en-US";

  const [from, setFrom] = useState(MONTH_AGO);
  const [to, setTo] = useState(TODAY);

  const [logs, setLogs] = useState<LogsData | null>(null);
  const [loadingLogs, setLL] = useState(false);
  const [logPage, setLogPage] = useState(1);
  const [logStatus, setLogStatus] = useState("all");
  const [logSearch, setLogSearch] = useState("");
  const [logType, setLogType] = useState("all");

  const fetchLogs = useCallback(async (page = logPage) => {
    setLL(true);
    try {
      const params = new URLSearchParams({
        type: "logs", from, to, page: String(page), limit: "50",
        ...(logStatus !== "all" && { status: logStatus }),
        ...(logType !== "all" && { msgType: logType }),
        ...(logSearch && { search: logSearch }),
      });
      const r = await fetch(`/api/reports?${params}`);
      if (r.ok) {
        setLogs(await r.json());
      }
    } catch {
      // ignore
    } finally {
      setLL(false);
    }
  }, [from, to, logPage, logStatus, logSearch, logType]);

  useEffect(() => {
    fetchLogs(1);
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [logStatus, logType]);

  const handleExport = () => {
    if (!logs?.messages?.length) return;
    const rows = logs.messages.map((m) => ({
      "التاريخ": formatDate(m.createdAt, dateLocale),
      "العميل": m.contact?.name || m.contact?.phone || "—",
      "الهاتف": m.contact?.phone || "—",
      "النوع": getTypeLabel(locale, m.type),
      "الاتجاه": getDirLabel(locale, m.direction),
      "الحالة": getStatusLabel(locale, m.status),
      "الحملة": m.campaign?.name || "—",
      "المحتوى": m.content || "—",
    }));
    exportExcel(rows, `logs-${TODAY}`);
  };

  return (
    <div className="space-y-6">
      {/* Top Filter Controls */}
      <Card className="rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm bg-white dark:bg-gray-900">
        <CardContent className="p-4 flex flex-wrap items-center gap-4 justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Label className="text-xs text-gray-500">{pageText[locale].from}</Label>
              <Input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="h-9 text-xs rounded-xl border-gray-200 dark:border-gray-700"
              />
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs text-gray-500">{pageText[locale].to}</Label>
              <Input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="h-9 text-xs rounded-xl border-gray-200 dark:border-gray-700"
              />
            </div>
            <Button
              onClick={() => fetchLogs(1)}
              variant="outline"
              size="sm"
              className="h-9 rounded-xl text-xs gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingLogs ? "animate-spin" : ""}`} />
              {pageText[locale].refresh}
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={handleExport}
              disabled={!logs?.messages?.length}
              variant="outline"
              size="sm"
              className="h-9 rounded-xl text-xs gap-1.5 border-emerald-200 text-emerald-700 dark:border-emerald-800 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              {pageText[locale].exportExcel}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Log Filters & Table */}
      <Card className="rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm bg-white dark:bg-gray-900">
        <CardContent className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="w-40">
                <Select value={logStatus} onValueChange={setLogStatus}>
                  <SelectTrigger className="h-9 text-xs rounded-xl">
                    <SelectValue placeholder={pageText[locale].logs.status} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{pageText[locale].logs.all}</SelectItem>
                    <SelectItem value="sent">{pageText[locale].logs.sent}</SelectItem>
                    <SelectItem value="delivered">{pageText[locale].logs.delivered}</SelectItem>
                    <SelectItem value="read">{pageText[locale].logs.read}</SelectItem>
                    <SelectItem value="failed">{pageText[locale].logs.failed}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="w-40">
                <Select value={logType} onValueChange={setLogType}>
                  <SelectTrigger className="h-9 text-xs rounded-xl">
                    <SelectValue placeholder={pageText[locale].logs.type} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{pageText[locale].logs.all}</SelectItem>
                    <SelectItem value="text">{pageText[locale].logs.text}</SelectItem>
                    <SelectItem value="template">{pageText[locale].logs.template}</SelectItem>
                    <SelectItem value="image">{pageText[locale].logs.image}</SelectItem>
                    <SelectItem value="audio">{pageText[locale].logs.audio}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Input
                placeholder={pageText[locale].logs.searchPlaceholder}
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchLogs(1)}
                className="h-9 text-xs w-48 rounded-xl"
              />
              <Button onClick={() => fetchLogs(1)} size="sm" className="h-9 rounded-xl text-xs">
                {pageText[locale].logs.searchButton}
              </Button>
            </div>
          </div>

          {loadingLogs ? (
            <div className="p-3"><TableRowsSkeleton rows={6} bare cols={3} /></div>
          ) : !logs?.messages?.length ? (
            <p className="text-center py-12 text-gray-400 text-sm">{pageText[locale].logs.noRecords}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800 text-gray-400 font-medium">
                    <th className="text-right py-3 px-3">{pageText[locale].logs.date}</th>
                    <th className="text-right py-3 px-3">{pageText[locale].logs.customer}</th>
                    <th className="text-right py-3 px-3">{pageText[locale].logs.phone}</th>
                    <th className="text-center py-3 px-3">{pageText[locale].logs.type}</th>
                    <th className="text-center py-3 px-3">{pageText[locale].logs.direction}</th>
                    <th className="text-center py-3 px-3">{pageText[locale].logs.status}</th>
                    <th className="text-right py-3 px-3">{pageText[locale].logs.campaign}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
                  {logs.messages.map((m) => (
                    <tr key={m.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                      <td className="py-3 px-3 text-gray-500 whitespace-nowrap">
                        {formatDate(m.createdAt, dateLocale)}
                      </td>
                      <td className="py-3 px-3 font-medium text-gray-800 dark:text-gray-200">
                        {m.contact?.name || "—"}
                      </td>
                      <td className="py-3 px-3 font-mono text-gray-500" dir="ltr">
                        {m.contact?.phone || "—"}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-[10px]">
                          {getTypeLabel(locale, m.type)}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-[10px]">
                          {getDirLabel(locale, m.direction)}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${statusColor[m.status] || "bg-gray-100 text-gray-600"}`}>
                          {getStatusLabel(locale, m.status)}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-gray-500 max-w-[150px] truncate">
                        {m.campaign?.name || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              {logs.total > logs.limit && (
                <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-100 dark:border-gray-800">
                  <p className="text-xs text-gray-400">
                    {pageText[locale].charts.totalLabelShort}: {formatNumber(logs.total, numberLocale)}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={logPage <= 1}
                      onClick={() => {
                        const p = logPage - 1;
                        setLogPage(p);
                        fetchLogs(p);
                      }}
                      className="h-8 w-8 p-0 rounded-xl"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                    <span className="text-xs text-gray-500">
                      {logPage} {pageText[locale].charts.pageOfLabel} {Math.ceil(logs.total / logs.limit)}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={logPage >= Math.ceil(logs.total / logs.limit)}
                      onClick={() => {
                        const p = logPage + 1;
                        setLogPage(p);
                        fetchLogs(p);
                      }}
                      className="h-8 w-8 p-0 rounded-xl"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
