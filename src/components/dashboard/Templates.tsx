"use client";

import { useState, useEffect, useCallback } from "react";
import { Layout, RefreshCw, Trash2, CheckCircle, XCircle, Clock } from "lucide-react";
import { toast } from "react-hot-toast";
import { syncWhatsAppTemplates } from "@/app/actions/whatsapp";

interface Template {
  id: string;
  name: string;
  content: string;
  language: string;
  category: string;
  status: string;
}

export default function Templates() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch("/api/chat?type=templates");
      const data = await res.json();
      setTemplates(data.templates || []);
    } catch (error) {
      toast.error("فشل تحميل القوالب");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await syncWhatsAppTemplates();
      if (res.success) {
        toast.success(`تمت مزامنة ${res.count} قالب بنجاح`);
        fetchTemplates();
      } else {
        toast.error(res.error || "فشل المزامنة");
      }
    } catch (error) {
      toast.error("حدث خطأ أثناء المزامنة");
    } finally {
      setSyncing(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا القالب محلياً؟")) return;
    try {
      const res = await fetch(`/api/templates/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("تم الحذف بنجاح");
        setTemplates(templates.filter((t) => t.id !== id));
      }
    } catch (error) {
      toast.error("فشل الحذف");
    }
  };

  const getStatusDetails = (status: string) => {
    switch (status?.toUpperCase()) {
      case "APPROVED":
        return { 
          label: "معتمد", 
          color: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800", 
          icon: <CheckCircle className="w-3 h-3" /> 
        };
      case "REJECTED":
        return { 
          label: "مرفوض", 
          color: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800", 
          icon: <XCircle className="w-3 h-3" /> 
        };
      default:
        return { 
          label: "قيد المراجعة", 
          color: "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800", 
          icon: <Clock className="w-3 h-3" /> 
        };
    }
  };

  const stats = {
    total: templates.length,
    approved: templates.filter(t => t.status?.toUpperCase() === "APPROVED").length,
    pending: templates.filter(t => t.status?.toUpperCase() !== "APPROVED" && t.status?.toUpperCase() !== "REJECTED").length,
  };

  if (loading) return <div className="p-20 text-center animate-pulse text-gray-500 dark:text-gray-400">جاري تحميل القوالب...</div>;

  return (
    <div className="p-6 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen transition-colors duration-200" dir="rtl">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <Layout className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            إدارة قوالب واتساب
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">إدارة ومزامنة القوالب المعتمدة من Meta</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex-1 md:flex-none bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "جاري المزامنة..." : "مزامنة من ميتا"}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="إجمالي القوالب" value={stats.total} color="blue" />
        <StatCard label="المعتمدة" value={stats.approved} color="green" />
        <StatCard label="في الانتظار" value={stats.pending} color="yellow" />
      </div>

      {/* Templates Grid/List */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        {templates.length > 0 ? (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {templates.map((t) => {
              const status = getStatusDetails(t.status);
              return (
                <div key={t.id} className="p-5 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      <h3 className="font-bold text-gray-900 dark:text-white">{t.name}</h3>
                      <span className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${status.color}`}>
                        {status.icon}
                        {status.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wider">{t.language} • {t.category}</p>
                    <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg border border-gray-100 dark:border-gray-700">
                      <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{t.content}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-end md:self-center">
                    <button
                      onClick={() => handleDelete(t.id)}
                      className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full transition-all"
                      title="حذف"
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
            <div className="bg-gray-50 dark:bg-gray-900/50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Layout className="w-8 h-8 text-gray-300 dark:text-gray-600" />
            </div>
            <p className="text-gray-500 dark:text-gray-400 font-medium">لا توجد قوالب معروضة حالياً</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">تأكد من ربط حسابك ثم اضغط على زر المزامنة</p>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: "blue" | "green" | "yellow" }) {
  const colors = {
    blue: "border-blue-500 text-blue-700 dark:text-blue-400 bg-blue-50/30 dark:bg-blue-900/10",
    green: "border-green-500 text-green-700 dark:text-green-400 bg-green-50/30 dark:bg-green-900/10",
    yellow: "border-yellow-500 text-yellow-700 dark:text-yellow-400 bg-yellow-50/30 dark:bg-yellow-900/10",
  };
  return (
    <div className={`p-5 rounded-2xl border-r-4 shadow-sm bg-white dark:bg-gray-800 border-l border-t border-b border-gray-100 dark:border-gray-700 ${colors[color]}`}>
      <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">{label}</p>
      <p className="text-3xl font-bold dark:text-white">{value}</p>
    </div>
  );
}