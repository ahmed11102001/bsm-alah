"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users,
  Send,
  CheckCircle,
  Eye,
  Plus,
  Loader2,
} from "lucide-react";
import EmailKpiCard from "./_components/overview/EmailKpiCard";
import EmailConnectionStatusBanner from "./_components/overview/EmailConnectionStatusBanner";
import RecentEmailCampaignsTable from "./_components/overview/RecentEmailCampaignsTable";
import RecentEmailActivityFeed from "./_components/overview/RecentEmailActivityFeed";
import { MOCK_OVERVIEW_STATS } from "./constants";
import type { EmailOverviewStats, EmailCampaignDTO } from "./types";

export default function EmailOverviewPage() {
  const [stats, setStats] = useState<EmailOverviewStats>(MOCK_OVERVIEW_STATS);
  const [recentCampaigns, setRecentCampaigns] = useState<EmailCampaignDTO[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [fromEmail, setFromEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/email/overview")
      .then((res) => res.json())
      .then((data) => {
        if (data && data.stats) {
          setStats(data.stats);
          setFromEmail(data.stats.fromEmail || null);
          if (Array.isArray(data.recentCampaigns)) {
            setRecentCampaigns(data.recentCampaigns);
          }
          if (Array.isArray(data.recentActivity)) {
            setRecentActivity(data.recentActivity);
          }
        }
      })
      .catch((err) => {
        console.error("[EmailOverviewPage] Failed to fetch overview:", err);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-red-600" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 flex items-center gap-2.5">
            <span>لوحة تحكم البريد الإلكتروني</span>
            <span className="rounded-full bg-red-50 border border-red-200 px-2.5 py-0.5 text-xs font-bold text-red-700">
              Email Hub
            </span>
          </h1>
          <p className="mt-1.5 text-sm text-slate-500">
            نظرة شاملة على أداء الحملات البريدية، جهات الاتصال، ومعدلات القبول عبر خادم SMTP.
          </p>
        </div>

        {/* Quick actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/dashboard/email/campaigns"
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-red-500/25 transition-all hover:from-red-700 hover:to-rose-700 active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span>حملة جديدة</span>
          </Link>
          <Link
            href="/dashboard/email/contacts"
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-sm transition-all hover:border-red-200 hover:bg-red-50/60 hover:text-red-600 active:scale-95"
          >
            <Users className="h-4 w-4" />
            <span>إضافة جهات اتصال</span>
          </Link>
        </div>
      </div>

      {/* SMTP Connection Warning / Status Banner */}
      <EmailConnectionStatusBanner
        isConfigured={stats.isSmtpConfigured}
        fromEmail={fromEmail}
      />

      {/* KPI Cards Grid */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <EmailKpiCard
          title="جهات الاتصال النشطة"
          value={stats.subscribedContacts.toLocaleString()}
          subtitle={`من إجمالي ${stats.totalContacts.toLocaleString()} جهة اتصال`}
          icon={Users}
          accentColor="red"
        />

        <EmailKpiCard
          title="الرسائل المقبولة (SMTP)"
          value={stats.totalEmailsSent.toLocaleString()}
          subtitle={`عبر ${stats.totalCampaigns} حملة بريدية`}
          icon={Send}
          accentColor="rose"
        />

        <EmailKpiCard
          title="نسبة القبول (Accepted)"
          value={`${stats.deliveryRate}%`}
          subtitle="معدل قبول خادم البريد للرسائل"
          icon={CheckCircle}
          accentColor="emerald"
        />

        <EmailKpiCard
          title="حالة خادم SMTP"
          value={stats.isSmtpConfigured ? "متصل ✅" : "غير مربوط ⚠️"}
          subtitle={stats.isSmtpConfigured ? (fromEmail || "الخادم جاهز للإرسال") : "يتطلب تهيئة الخادم"}
          icon={Eye}
          accentColor="amber"
        />
      </div>

      {/* Lower Section: Recent Campaigns (3 cols) + Recent Activity Feed (2 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3">
          <RecentEmailCampaignsTable campaigns={recentCampaigns} />
        </div>
        <div className="lg:col-span-2">
          <RecentEmailActivityFeed items={recentActivity} />
        </div>
      </div>
    </div>
  );
}
