"use client";
import { ReportsOverviewSkeleton } from "@/components/dashboard/DashboardSkeletons";

import { useState, useEffect, useCallback } from "react";
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ArrowUpRight, CheckCircle, ChevronLeft, ChevronRight,
  DollarSign, Loader2, Package, RefreshCw, ShoppingBag,
  Star, Store, TrendingUp, Users, Zap,
} from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import {
  type StoreReportData, TODAY, MONTH_AGO, pageText, formatNumber, formatDate,
} from "../_shared";

export default function ReportsStorePage() {
  const { locale } = useLanguage();
  const numberLocale = locale === "ar" ? "ar-EG" : "en-US";
  const dateLocale = locale === "ar" ? "ar-EG" : "en-US";

  const [from, setFrom] = useState(MONTH_AGO);
  const [to, setTo] = useState(TODAY);

  const [storeReport, setStoreReport] = useState<StoreReportData | null>(null);
  const [loadingStore, setLS] = useState(false);
  const [ordersPage, setOrdersPage] = useState(1);
  const [orderFilter, setOrderFilter] = useState("all");

  const fetchStoreReport = useCallback(async () => {
    setLS(true);
    try {
      const params = new URLSearchParams({
        from, to,
        ordersPage: String(ordersPage),
        orderFilter: orderFilter
      });
      const r = await fetch(`/api/reports/store?${params}`);
      if (r.ok) setStoreReport(await r.json());
    } finally { setLS(false); }
  }, [from, to, ordersPage, orderFilter]);

  useEffect(() => { fetchStoreReport(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [ordersPage, orderFilter]);

  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto" dir={locale === "ar" ? "rtl" : "ltr"}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {pageText[locale].tabs.store}
        </h1>
      </div>

      <Card className="border border-gray-100 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800 mb-6">
        <CardContent className="p-4 flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-gray-500 dark:text-gray-400">من</Label>
            <Input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className="w-36 text-sm" />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-gray-500 dark:text-gray-400">إلى</Label>
            <Input type="date" value={to} min={from} max={TODAY} onChange={(e) => setTo(e.target.value)} className="w-36 text-sm" />
          </div>
          <Button size="sm" className="bg-green-500 hover:bg-green-600 text-white gap-1.5" onClick={fetchStoreReport}>
            <RefreshCw className="w-3.5 h-3.5" /> {pageText[locale].refresh}
          </Button>
        </CardContent>
      </Card>

          {loadingStore ? (
            <ReportsOverviewSkeleton />
          ) : !storeReport ? (
            <Card className="border border-gray-100 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800">
              <CardContent className="p-12 text-center text-gray-400">
                <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">{pageText[locale].store.noData}</p>
                <p className="text-xs mt-1">{pageText[locale].store.connectHint}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">

              {/* ── Connected Stores ── */}
              {storeReport.stores.length > 0 && (
                <div className="flex flex-wrap gap-3 mb-2">
                  {storeReport.stores.map((s) => (
                    <div key={s.name}
                      className="flex items-center gap-2 bg-white border border-gray-100 rounded-xl px-4 py-2 shadow-sm text-sm">
                      <Store className="w-4 h-4 text-green-500" />
                      <span className="font-medium text-gray-700">{s.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${s.source === "shopify"
                          ? "bg-green-50 text-green-600"
                          : "bg-blue-50 text-blue-600"
                        }`}>
                        {s.source === "shopify" ? "Shopify" : "EasyOrders"}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${s.isActive ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-400"
                        }`}>
                        {s.isActive ? pageText[locale].store.active : pageText[locale].store.inactive}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* ── KPIs ── */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <Card className="border border-gray-100 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800 col-span-1">
                  <CardContent className="p-4 flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                      <Package className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{pageText[locale].store.totalOrders}</p>
                      <p className="text-xl font-bold text-gray-800">
                        {formatNumber(storeReport.summary.totalOrders, numberLocale)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border border-gray-100 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800 col-span-1">
                  <CardContent className="p-4 flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
                      <DollarSign className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{pageText[locale].store.totalRevenue}</p>
                      <p className="text-xl font-bold text-gray-800">
                        {formatNumber(storeReport.summary.totalRevenue, numberLocale, { maximumFractionDigits: 0 })}
                      </p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border border-gray-100 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800 col-span-1 border-l-4 border-l-[#25D366]">
                  <CardContent className="p-4 flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#25D366]/10 flex items-center justify-center flex-shrink-0">
                      <Zap className="w-4 h-4 text-[#25D366]" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{pageText[locale].store.campaignRevenue}</p>
                      <p className="text-xl font-bold text-[#25D366]">
                        {formatNumber(storeReport.summary.totalCampaignRevenue, numberLocale, { maximumFractionDigits: 0 })}
                      </p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border border-gray-100 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800 col-span-1">
                  <CardContent className="p-4 flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center flex-shrink-0">
                      <TrendingUp className="w-4 h-4 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{pageText[locale].store.campaignShare}</p>
                      <p className="text-xl font-bold text-purple-700">
                        {storeReport.summary.campaignRevenueShare}%
                      </p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border border-gray-100 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800 col-span-1">
                  <CardContent className="p-4 flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center flex-shrink-0">
                      <Users className="w-4 h-4 text-orange-500" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{pageText[locale].store.uniqueCustomers}</p>
                      <p className="text-xl font-bold text-gray-800">
                        {formatNumber(storeReport.summary.totalUniqueCustomers, numberLocale)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border border-gray-100 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800 col-span-1">
                  <CardContent className="p-4 flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center flex-shrink-0">
                      <Store className="w-4 h-4 text-teal-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{pageText[locale].store.storesConnected}</p>
                      <p className="text-xl font-bold text-gray-800">
                        {storeReport.summary.storesConnected}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* ── Revenue Attribution — Campaign Bar ── */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Campaign Revenue Share Visual */}
                <Card className="border border-gray-100 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <Zap className="w-4 h-4 text-[#25D366]" />
                      {pageText[locale].store.whatsappCampaignRevenue}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-4">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-500 dark:text-gray-400">{locale === "ar" ? "حملات واتساب" : "WhatsApp Campaigns"}</span>
                        <span className="font-bold text-[#25D366]">{storeReport.summary.campaignRevenueShare}%</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden">
                        <div
                          className="h-4 rounded-full bg-gradient-to-r from-[#25D366] to-emerald-400 transition-all duration-700"
                          style={{ width: `${Math.min(storeReport.summary.campaignRevenueShare, 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between mt-2 text-xs text-gray-400">
                        <span>
                          {locale === "ar" ? "إيرادات الحملات:" : "Campaign revenue:"} {formatNumber(storeReport.summary.totalCampaignRevenue, numberLocale, { maximumFractionDigits: 0 })} EGP
                        </span>
                        <span>
                          {locale === "ar" ? "إجمالي:" : "Total:"} {formatNumber(storeReport.summary.totalRevenue, numberLocale, { maximumFractionDigits: 0 })} EGP
                        </span>
                      </div>
                    </div>

                    {/* Orders by Status */}
                    {storeReport.ordersByStatus.length > 0 && (
                      <div className="mt-4 space-y-2">
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">{pageText[locale].store.ordersByStatus}</p>
                        {storeReport.ordersByStatus.map((s) => {
                          const total = storeReport.summary.totalOrders || 1;
                          const pct = Math.round((s.count / total) * 100);
                          const colors: Record<string, string> = {
                            pending: "bg-yellow-400",
                            fulfilled: "bg-green-400",
                            shipped: "bg-blue-400",
                            cancelled: "bg-red-400",
                          };
                          const labels: Record<string, string> = {
                            pending: locale === "ar" ? "انتظار" : "Pending", fulfilled: locale === "ar" ? "مكتمل" : "Fulfilled",
                            shipped: locale === "ar" ? "تم الشحن" : "Shipped", cancelled: locale === "ar" ? "ملغي" : "Cancelled",
                          };
                          return (
                            <div key={s.status}>
                              <div className="flex justify-between text-xs mb-0.5">
                                <span className="text-gray-600">{labels[s.status] ?? s.status}</span>
                                <span className="text-gray-500 dark:text-gray-400">{s.count} {pageText[locale].charts.orders} ({pct}%)</span>
                              </div>
                              <div className="w-full bg-gray-100 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full ${colors[s.status] ?? "bg-gray-400"}`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Daily Revenue Trend Chart */}
                <Card className="border border-gray-100 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-blue-500" />
                      {pageText[locale].charts.dailyTrendTitle}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {storeReport.dailyTrend.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-8">{pageText[locale].charts.dailyTrendNoData}</p>
                    ) : (
                      <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={storeReport.dailyTrend}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis dataKey="day" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
                          <YAxis tick={{ fontSize: 10 }} />
                          <Tooltip
                            formatter={(val, name) => {
                              const value = typeof val === "number" ? val : Number(val ?? 0);
                              return [
                                name === "revenue"
                                  ? `${formatNumber(value, numberLocale)} EGP`
                                  : value,
                                name === "revenue" ? pageText[locale].store.revenue : pageText[locale].store.orders,
                              ];
                            }}
                            labelFormatter={(l) => `${pageText[locale].charts.dayLabel}: ${l}`}
                          />
                          <Line type="monotone" dataKey="orders" stroke="#3b82f6" strokeWidth={2} dot={false} />
                          <Line type="monotone" dataKey="revenue" stroke="#25D366" strokeWidth={2} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* ── Revenue Attribution per Campaign ── */}
              {storeReport.campaignRevenue.length > 0 && (
                <Card className="border border-gray-100 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <ArrowUpRight className="w-4 h-4 text-[#25D366]" />
                      {locale === "ar" ? "Revenue Attribution — الإيرادات المنسوبة للحملات" : "Revenue Attribution"}
                    </CardTitle>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {pageText[locale].store.whatsappCampaignRevenueHint}
                    </p>
                  </CardHeader>
                  <CardContent className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 text-xs text-gray-400">
                          <th className="text-right py-2 pr-2">{pageText[locale].logs.campaign}</th>
                          <th className="text-center py-2">{locale === "ar" ? "الإيراد المنسوب" : "Attributed Revenue"}</th>
                          <th className="text-center py-2">{pageText[locale].charts.orders}</th>
                          <th className="text-center py-2">{pageText[locale].logs.sent}</th>
                          <th className="text-center py-2">{pageText[locale].logs.read}</th>
                          <th className="text-center py-2">{locale === "ar" ? "معدل التحويل" : "Conversion Rate"}</th>
                          <th className="text-center py-2">{locale === "ar" ? "الإيراد/رسالة" : "Rev/Message"}</th>
                          <th className="text-right py-2 pl-2">{pageText[locale].store.date}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {storeReport.campaignRevenue.map((c) => {
                          const convRate = c.sentCount > 0
                            ? ((c.ordersCount / c.sentCount) * 100).toFixed(1)
                            : "0";
                          const revPerMsg = c.sentCount > 0
                            ? (c.revenue / c.sentCount).toFixed(1)
                            : "0";
                          return (
                            <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                              <td className="py-3 pr-2">
                                <div className="font-medium text-gray-800 max-w-[180px] truncate">{c.name}</div>
                              </td>
                              <td className="py-3 text-center">
                                <span className="font-bold text-[#25D366]">
                                  {formatNumber(c.revenue, numberLocale, { maximumFractionDigits: 0 })} EGP
                                </span>
                              </td>
                              <td className="py-3 text-center">
                                <span className="bg-blue-50 text-blue-700 rounded-full px-2 py-0.5 text-xs font-semibold">
                                  {c.ordersCount}
                                </span>
                              </td>
                              <td className="py-3 text-center text-gray-600">{formatNumber(c.sentCount, numberLocale)}</td>
                              <td className="py-3 text-center text-gray-600">{formatNumber(c.readCount, numberLocale)}</td>
                              <td className="py-3 text-center">
                                <span className={`font-semibold text-xs px-2 py-0.5 rounded-full ${parseFloat(convRate) >= 5 ? "bg-green-50 text-green-600"
                                    : parseFloat(convRate) >= 2 ? "bg-yellow-50 text-yellow-600"
                                      : "bg-gray-100 text-gray-500 dark:text-gray-400"
                                  }`}>
                                  {convRate}%
                                </span>
                              </td>
                              <td className="py-3 text-center text-gray-500 dark:text-gray-400 text-xs">{revPerMsg} EGP</td>
                              <td className="py-3 pl-2 text-right text-xs text-gray-400">
                                {c.completedAt
                                  ? formatDate(c.completedAt, dateLocale, { day: "numeric", month: "short" })
                                  : "—"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>

                    {/* Revenue Bar Chart */}
                    <div className="mt-6">
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3">{pageText[locale].charts.revenueComparison}</p>
                      <ResponsiveContainer width="100%" height={180}>
                        <BarChart data={storeReport.campaignRevenue.slice(0, 8)} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                          <XAxis type="number" tick={{ fontSize: 10 }}
                            tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                          <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={100}
                            tickFormatter={(v) => v.length > 14 ? v.slice(0, 14) + "…" : v} />
                          <Tooltip
                            formatter={(value: any) => {
                              const num = typeof value === "number" ? value : Number(value);
                              return !isNaN(num)
                                ? [`${formatNumber(num, numberLocale)} EGP`, locale === "ar" ? "الإيراد" : "Revenue"]
                                : ["", ""];
                            }}
                          />
                          <Bar dataKey="revenue" fill="#25D366" radius={[0, 4, 4, 0]}>
                            {storeReport.campaignRevenue.slice(0, 8).map((_, i) => (
                              <Cell key={i}
                                fill={i === 0 ? "#25D366" : i === 1 ? "#34d399" : "#6ee7b7"}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* ── Top Customers ── */}
              {storeReport.topCustomers.length > 0 && (
                <Card className="border border-gray-100 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <Star className="w-4 h-4 text-amber-500" />
                      {pageText[locale].charts.topCustomersTitle}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 text-xs text-gray-400">
                          <th className="text-right py-2 pr-2">#</th>
                          <th className="text-right py-2">{pageText[locale].store.customer}</th>
                          <th className="text-center py-2">{pageText[locale].store.phone}</th>
                          <th className="text-center py-2">{pageText[locale].charts.orders}</th>
                          <th className="text-left py-2 pl-2">{locale === "ar" ? "إجمالي الإنفاق" : "Total Spent"}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {storeReport.topCustomers.map((c, i) => (
                          <tr key={c.phone} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                            <td className="py-3 pr-2 text-gray-400 text-xs">{i + 1}</td>
                            <td className="py-3">
                              <div className="font-medium text-gray-800">{c.name ?? "—"}</div>
                            </td>
                            <td className="py-3 text-center text-gray-500 dark:text-gray-400 text-xs font-mono">{c.phone}</td>
                            <td className="py-3 text-center">
                              <span className="bg-gray-100 text-gray-600 rounded-full px-2 py-0.5 text-xs">
                                {c.ordersCount}
                              </span>
                            </td>
                            <td className="py-3 pl-2 text-left font-bold text-green-600">
                              {formatNumber(c.totalSpent, numberLocale, { maximumFractionDigits: 0 })} {c.currency}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              )}

              {/* ── Confirmed/Cancelled Orders ── */}
              {storeReport.confirmedOrders && (
                <Card className="border border-gray-100 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800 mt-6">
                  <CardHeader className="pb-2 border-b border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      {pageText[locale].charts.confirmedOrdersTitle}
                    </CardTitle>
                    <div className="flex gap-2">
                      <Select value={orderFilter} onValueChange={(val) => { setOrderFilter(val); setOrdersPage(1); }}>
                        <SelectTrigger className="w-32 h-8 text-xs">
                          <SelectValue placeholder={pageText[locale].charts.filterPlaceholder} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{pageText[locale].store.all}</SelectItem>
                          <SelectItem value="confirmed">{pageText[locale].store.confirmed}</SelectItem>
                          <SelectItem value="cancelled">{pageText[locale].store.cancelled}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0 overflow-x-auto">
                    {storeReport.confirmedOrders.length === 0 ? (
                      <div className="text-center text-gray-500 py-8 text-sm">
                        {pageText[locale].store.noOrders}
                      </div>
                    ) : (
                      <>
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-gray-100 dark:border-gray-700 text-xs text-gray-400 bg-gray-50/50 dark:bg-gray-800/50">
                              <th className="text-right py-3 px-4 font-medium">{pageText[locale].store.orderNumber}</th>
                              <th className="text-right py-3 px-4 font-medium">{pageText[locale].store.customer}</th>
                              <th className="text-center py-3 px-4 font-medium">{pageText[locale].store.phone}</th>
                              <th className="text-center py-3 px-4 font-medium">{pageText[locale].store.status}</th>
                              <th className="text-left py-3 px-4 font-medium">{pageText[locale].store.total}</th>
                              <th className="text-left py-3 px-4 font-medium">{pageText[locale].store.date}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {storeReport.confirmedOrders.map((o) => (
                              <tr key={o.id} className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50/50 dark:hover:bg-gray-800 transition-colors">
                                <td className="py-3 px-4 text-gray-600 font-mono text-xs">{o.orderNumber || o.externalId}</td>
                                <td className="py-3 px-4 font-medium text-gray-800 dark:text-gray-200">{o.customerName || "—"}</td>
                                <td className="py-3 px-4 text-center text-gray-500 dark:text-gray-400 text-xs font-mono" dir="ltr">{o.customerPhone}</td>
                                <td className="py-3 px-4 text-center">
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${o.status === "confirmed" ? "bg-green-100 text-green-700" :
                                      o.status === "cancelled" ? "bg-red-100 text-red-700" :
                                        "bg-gray-100 text-gray-600"
                                    }`}>
                                    {o.status === "confirmed" ? (locale === "ar" ? "مؤكد" : "Confirmed") : o.status === "cancelled" ? (locale === "ar" ? "ملغى" : "Cancelled") : o.status}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-left font-bold text-green-600 text-xs">
                                  {formatNumber(o.total, numberLocale, { maximumFractionDigits: 0 })} {o.currency}
                                </td>
                                <td className="py-3 px-4 text-left text-gray-400 text-xs" dir="ltr">
                                  {formatDate(o.orderedAt, dateLocale, { dateStyle: "short", timeStyle: "short" })}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>

                        {/* Pagination */}
                        <div className="flex items-center justify-between p-4 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-500">
                          <div>
                            {locale === "ar" ? "إجمالي:" : "Total:"} <span className="font-medium text-gray-800 dark:text-gray-200">{formatNumber(storeReport.confirmedOrdersTotal, numberLocale)}</span> {locale === "ar" ? "أوردر" : "orders"}
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline" size="sm" className="h-7 px-2"
                              disabled={ordersPage <= 1}
                              onClick={() => setOrdersPage(p => p - 1)}
                            >
                              {locale === "ar" ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                            </Button>
                            <span className="font-mono">{ordersPage}</span>
                            <Button
                              variant="outline" size="sm" className="h-7 px-2"
                              disabled={ordersPage * 50 >= storeReport.confirmedOrdersTotal}
                              onClick={() => setOrdersPage(p => p + 1)}
                            >
                              {locale === "ar" ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            </Button>
                          </div>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              )}

            </div>
          )}
    </div>
  );
}