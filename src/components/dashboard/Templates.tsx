"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, RefreshCw, CheckCircle2, Clock, XCircle, Layout } from "lucide-react";
import { syncWhatsAppTemplates } from "@/app/actions/whatsapp";
import { toast } from "sonner";
import { useLanguage } from "@/lib/language-context";

interface Template {
  id: string;
  name: string;
  content?: string;
  status?: string;
  language?: string;
  category?: string;
  createdAt?: string;
}

type StatusKey = "APPROVED" | "REJECTED" | "PENDING";

function getStatusDetails(status: string | undefined, labels: Record<StatusKey, string>) {
  const s = (status?.toUpperCase() ?? "PENDING") as StatusKey;
  switch (s) {
    case "APPROVED":
      return {
        label: labels.APPROVED,
        color: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800",
        icon:  <CheckCircle2 className="w-3 h-3" />,
      };
    case "REJECTED":
      return {
        label: labels.REJECTED,
        color: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800",
        icon:  <XCircle className="w-3 h-3" />,
      };
    default:
      return {
        label: labels.PENDING,
        color: "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800",
        icon:  <Clock className="w-3 h-3" />,
      };
  }
}

function StatCard({ label, value, color }: { label: string; value: number; color: "blue" | "green" | "yellow" }) {
  const colors = {
    blue:   "border-blue-500   text-blue-700   dark:text-blue-300   bg-white dark:bg-gray-800 dark:border-blue-600",
    green:  "border-green-500  text-green-700  dark:text-green-300  bg-white dark:bg-gray-800 dark:border-green-600",
    yellow: "border-yellow-500 text-yellow-700 dark:text-yellow-300 bg-white dark:bg-gray-800 dark:border-yellow-600",
  };
  return (
    <div className={`p-5 rounded-2xl border-r-4 shadow-sm border border-gray-100 dark:border-gray-700 ${colors[color]}`}>
      <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">{label}</p>
      <p className="text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
    </div>
  );
}

export default function TemplatesPage() {
  const { t, dir } = useLanguage();
  const tm = t.templates;

  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [syncing,   setSyncing]   = useState(false);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/templates");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setTemplates(Array.isArray(data) ? data : []);
    } catch {
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTemplates(); }, []);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await syncWhatsAppTemplates();
      if (result.success) {
        toast.success(tm.syncSuccess(result.count ?? 0));
        await fetchTemplates();
      } else {
        toast.error(result.error || tm.syncError);
      }
    } catch {
      toast.error(tm.syncError);
    } finally {
      setSyncing(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(tm.deleteConfirm)) return;
    try {
      const res = await fetch("/api/templates", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setTemplates(prev => prev.filter(t => t.id !== id));
        toast.success(tm.deleteSuccess);
      } else {
        toast.error(tm.deleteFailed);
      }
    } catch {
      toast.error(tm.deleteError);
    }
  };

  const stats = {
    total:    templates.length,
    approved: templates.filter(t => t.status?.toUpperCase() === "APPROVED").length,
    pending:  templates.filter(t => t.status?.toUpperCase() !== "APPROVED" && t.status?.toUpperCase() !== "REJECTED").length,
  };

  if (loading) {
    return (
      <div className="p-20 text-center animate-pulse text-gray-500 dark:text-gray-400">
        {tm.loading}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 min-h-screen bg-gray-50 dark:bg-gray-900" dir={dir}>

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <Layout className="w-6 h-6 text-blue-500 dark:text-blue-400" />
            {tm.title}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{tm.subtitle}</p>
        </div>

        <div className="flex gap-3 w-full md:w-auto">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex-1 md:flex-none bg-[#25D366] hover:bg-[#1fb956] text-white px-5 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? tm.syncing : tm.syncBtn}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label={tm.stats.total}    value={stats.total}    color="blue"   />
        <StatCard label={tm.stats.approved} value={stats.approved} color="green"  />
        <StatCard label={tm.stats.pending}  value={stats.pending}  color="yellow" />
      </div>

      {/* Templates list */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        {templates.length > 0 ? (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {templates.map((tpl) => {
              const statusInfo = getStatusDetails(tpl.status, tm.status);
              return (
                <div
                  key={tpl.id}
                  className="p-5 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
                >
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="font-bold text-gray-900 dark:text-white">{tpl.name}</h3>
                      <span className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusInfo.color}`}>
                        {statusInfo.icon}
                        {statusInfo.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                      {tpl.language} • {tpl.category}
                    </p>
                    <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg border border-gray-100 dark:border-gray-600">
                      <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{tpl.content}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-center">
                    <button
                      onClick={() => handleDelete(tpl.id)}
                      className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-all"
                      title={tm.deleteConfirm}
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-16 text-center">
            <div className="bg-gray-50 dark:bg-gray-700 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Layout className="w-8 h-8 text-gray-300 dark:text-gray-500" />
            </div>
            <p className="text-gray-500 dark:text-gray-400 font-medium">{tm.empty}</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">{tm.emptyHint}</p>
          </div>
        )}
      </div>
    </div>
  );
}