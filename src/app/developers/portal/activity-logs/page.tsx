"use client";

import { useState, useEffect } from "react";
import { Activity, CheckCircle, XCircle, Clock, AlertTriangle, Loader2 } from "lucide-react";

interface OtpLog {
  id: string;
  phone: string;
  status: "sent" | "verified" | "expired" | "failed";
  createdAt: string;
  verifiedAt?: string;
  error?: string;
}

export default function ActivityLogsPage() {
  const [logs, setLogs] = useState<OtpLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    // TODO: Fetch real logs from API
    // For now, show empty state
    setLoading(false);
  }, []);

  const filteredLogs = filter === "all" ? logs : logs.filter((l) => l.status === filter);

  const statusConfig: Record<string, { icon: any; color: string; label: string }> = {
    sent: { icon: Clock, color: "#3b82f6", label: "تم الإرسال" },
    verified: { icon: CheckCircle, color: "#25D366", label: "تم التحقق" },
    expired: { icon: AlertTriangle, color: "#f59e0b", label: "انتهى" },
    failed: { icon: XCircle, color: "#ef4444", label: "فشل" },
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">Activity Logs</h1>
        <p className="text-white/50">سجل كل عمليات إرسال وتحقق الـ OTP</p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        {["all", "sent", "verified", "expired", "failed"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              filter === f
                ? "bg-[#25D366]/10 text-[#25D366] border border-[#25D366]/20"
                : "bg-white/5 text-white/50 border border-white/10 hover:bg-white/10 hover:text-white/70"
            }`}
          >
            {f === "all" ? "الكل" : statusConfig[f]?.label || f}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-white/[0.03] border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left text-white/40 text-sm font-medium px-6 py-4">الحالة</th>
                <th className="text-left text-white/40 text-sm font-medium px-6 py-4">الرقم</th>
                <th className="text-left text-white/40 text-sm font-medium px-6 py-4">الوقت</th>
                <th className="text-left text-white/40 text-sm font-medium px-6 py-4">ملاحظات</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="text-center py-12">
                    <Loader2 size={24} className="animate-spin text-[#25D366] mx-auto" />
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-12">
                    <Activity size={32} className="text-white/20 mx-auto mb-3" />
                    <p className="text-white/40">مفيش logs لسه</p>
                    <p className="text-white/30 text-sm mt-1">أول ما تبعت OTP هتظهر هنا</p>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const config = statusConfig[log.status];
                  const Icon = config.icon;
                  return (
                    <tr key={log.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Icon size={16} style={{ color: config.color }} />
                          <span className="text-sm" style={{ color: config.color }}>
                            {config.label}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-white/80 font-mono text-sm">{log.phone}</td>
                      <td className="px-6 py-4 text-white/50 text-sm">
                        {new Date(log.createdAt).toLocaleString("ar-EG")}
                      </td>
                      <td className="px-6 py-4 text-white/40 text-sm">
                        {log.error || (log.verifiedAt ? "Verified at " + new Date(log.verifiedAt).toLocaleTimeString("ar-EG") : "—")}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
