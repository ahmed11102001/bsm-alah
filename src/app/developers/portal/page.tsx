"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Key,
  Settings,
  Code,
  Zap,
  Activity,
  ArrowRight,
  TrendingUp,
  MessageSquare,
  Shield,
} from "lucide-react";

interface Stats {
  totalSent: number;
  totalVerified: number;
  totalFailed: number;
  successRate: number;
}

export default function PortalDashboardPage() {
  const [stats, setStats] = useState<Stats>({
    totalSent: 0,
    totalVerified: 0,
    totalFailed: 0,
    successRate: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Fetch real stats from API
    // For now, show empty state
    setLoading(false);
  }, []);

  const quickActions = [
    {
      icon: Key,
      title: "API Keys",
      desc: "إدارة مفاتيح الـ API",
      href: "/developers/portal/api-keys",
      color: "#25D366",
    },
    {
      icon: Settings,
      title: "OTP Settings",
      desc: "إعدادات قوالب الـ OTP",
      href: "/developers/portal/otp-templates",
      color: "#3b82f6",
    },
    {
      icon: Code,
      title: "Quick Start",
      desc: "كود جاهز للت integration",
      href: "/developers/portal/quick-start",
      color: "#8b5cf6",
    },
    {
      icon: Zap,
      title: "Live Tester",
      desc: "جرب الـ API مباشرة",
      href: "/developers/portal/live-tester",
      color: "#f59e0b",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">
          مرحباً بيك في الـ Developer Portal 👋
        </h1>
        <p className="text-white/50">
          إدارة OTP API — أرسل وتحقق من أكواد OTP عبر WhatsApp
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          icon={MessageSquare}
          label="إجمالي الإرسال"
          value={stats.totalSent}
          color="#25D366"
        />
        <StatCard
          icon={Shield}
          label="تم التحقق"
          value={stats.totalVerified}
          color="#3b82f6"
        />
        <StatCard
          icon={TrendingUp}
          label="معدل النجاح"
          value={`${stats.successRate}%`}
          color="#8b5cf6"
        />
        <StatCard
          icon={Activity}
          label="فشل"
          value={stats.totalFailed}
          color="#ef4444"
        />
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="text-white font-semibold mb-4">وصول سريع</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.href}
                href={action.href}
                className="group p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-white/20 hover:bg-white/[0.05] transition-all"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                  style={{ backgroundColor: action.color + "20", color: action.color }}
                >
                  <Icon size={20} />
                </div>
                <h4 className="text-white font-medium mb-1">{action.title}</h4>
                <p className="text-white/40 text-sm mb-3">{action.desc}</p>
                <div className="flex items-center gap-1 text-sm" style={{ color: action.color }}>
                  <span>افتح</span>
                  <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* API Endpoints Preview */}
      <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold">نقاط الـ API</h3>
          <Link
            href="/developers/portal/endpoints"
            className="text-[#25D366] text-sm hover:underline"
          >
            شوف الكل
          </Link>
        </div>
        <div className="space-y-3">
          <EndpointRow method="POST" path="/api/v1/otp/send" desc="إرسال كود OTP" />
          <EndpointRow method="POST" path="/api/v1/otp/verify" desc="التحقق من الكود" />
          <EndpointRow method="GET" path="/api/v1/otp/status/:token" desc="حالة الـ OTP" />
          <EndpointRow method="GET" path="/api/v1/otp/logs" desc="سجل الأحداث" />
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: any;
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10">
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
        style={{ backgroundColor: color + "20", color }}
      >
        <Icon size={20} />
      </div>
      <p className="text-white/40 text-sm mb-1">{label}</p>
      <p className="text-2xl font-bold text-white">{value}</p>
    </div>
  );
}

function EndpointRow({
  method,
  path,
  desc,
}: {
  method: string;
  path: string;
  desc: string;
}) {
  const methodColors: Record<string, string> = {
    GET: "#3b82f6",
    POST: "#25D366",
    PUT: "#f59e0b",
    DELETE: "#ef4444",
  };

  return (
    <div className="flex items-center gap-4 p-3 rounded-xl bg-white/5 hover:bg-white/[0.07] transition-colors">
      <span
        className="px-2.5 py-1 rounded-md text-xs font-bold font-mono"
        style={{ backgroundColor: methodColors[method] + "20", color: methodColors[method] }}
      >
        {method}
      </span>
      <code className="text-white/80 font-mono text-sm flex-1">{path}</code>
      <span className="text-white/40 text-sm">{desc}</span>
    </div>
  );
}
