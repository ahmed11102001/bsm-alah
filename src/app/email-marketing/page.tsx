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
import { MOCK_OVERVIEW_STATS } from "./constants";
import type { EmailOverviewStats, EmailCampaignDTO } from "./types";

export default function EmailOverviewPage() {
  const [stats, setStats] = useState<EmailOverviewStats>(MOCK_OVERVIEW_STATS);
  const [recentCampaigns, setRecentCampaigns] = useState<EmailCampaignDTO[]>([]);
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
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2.5">
            <span>لوحة تحكم البريد الإلكتروني</span>
            <span className="rounded-full bg-blue-500/20 border border-blue-500/30 px-2.5 py-0.5 text-xs font-semibold text-blue-300">
              Email Hub
            </span>
          </h1>
          <p className="mt-1.5 text-sm text-white/60">
            نظرة شاملة على أداء الحملات البريدية، جهات الاتصال، ومعدلات التسليم والتفاعل.
          </p>
        </div>

        {/* Quick actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/dashboard/email/campaigns"
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-500/20 transition-all hover:brightness-110 active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span>حملة جديدة</span>
          </Link>
          <Link
            href="/dashboard/email/contacts"
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs font-semibold text-white/80 transition-all hover:bg-white/[0.08]"
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
          trend="+100%"
          trendUp={true}
          accentColor="blue"
        />

        <EmailKpiCard
          title="إجمالي الرسائل المرسلة"
          value={stats.totalEmailsSent.toLocaleString()}
          subtitle={`عبر ${stats.totalCampaigns} حملة بريدية`}
          icon={Send}
          accentColor="indigo"
        />

        <EmailKpiCard
          title="معدل التسليم الناجح"
          value={`${stats.deliveryRate}%`}
          subtitle="نسبة وصول الرسائل للـ Inbox"
          icon={CheckCircle}
          accentColor="emerald"
        />

        <EmailKpiCard
          title="حالة خادم SMTP"
          value={stats.isSmtpConfigured ? "متصل ✅" : "غير مربوط ⚠️"}
          subtitle={stats.isSmtpConfigured ? "الخادم جاهز للإرسال" : "يتطلب تهيئة الخادم"}
          icon={Eye}
          accentColor="amber"
        />
      </div>

      {/* Recent Campaigns Table */}
      <RecentEmailCampaignsTable campaigns={recentCampaigns} />
    </div>
  );
}
