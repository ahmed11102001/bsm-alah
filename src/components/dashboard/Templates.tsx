"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, RefreshCw, CheckCircle2, Clock, XCircle, Layout } from "lucide-react";
import { syncWhatsAppTemplates } from "@/app/actions/whatsapp";
import { toast } from "sonner"; // لو بتستخدم sonner للإشعارات

interface Template {
  id: string;
  name: string;
  content?: string;
  status?: string;
  language?: string;
  category?: string;
  createdAt?: string;
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 1. جلب القوالب من الـ API الداخلي
  const fetchTemplates = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/templates");

      if (!res.ok) {
        throw new Error("فشل في تحميل القوالب من السيرفر");
      }

      const data = await res.json();
      setTemplates(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message);
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  // 2. دالة المزامنة باستخدام الـ Server Action الجديد
  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await syncWhatsAppTemplates();
      if (result.success) {
        toast.success(`تمت مزامنة ${result.count} قالب بنجاح`);
        await fetchTemplates(); // إعادة تحميل القائمة بعد المزامنة
      } else {
        toast.error(result.error || "حدث خطأ أثناء المزامنة");
      }
    } catch (err) {
      toast.error("فشلت عملية المزامنة");
    } finally {
      setSyncing(false);
    }
  };

  // 3. حذف قالب
  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا القالب؟")) return;

    try {
      const res = await fetch("/api/templates", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });

      if (res.ok) {
        setTemplates(templates.filter(t => t.id !== id));
        toast.success("تم حذف القالب");
      } else {
        toast.error("فشل حذف القالب");
      }
    } catch (err) {
      toast.error("حدث خطأ أثناء الحذف");
    }
  };

  // دالة مساعدة لتنسيق حالة القالب وألوانه
  const getStatusDetails = (status?: string) => {
    const s = status?.toUpperCase();
    switch (s) {
      case "APPROVED":
        return { label: "معتمد", color: "bg-green-100 text-green-700 border-green-200", icon: <CheckCircle2 className="w-3 h-3" /> };
      case "REJECTED":
        return { label: "مرفوض", color: "bg-red-100 text-red-700 border-red-200", icon: <XCircle className="w-3 h-3" /> };
      default:
        return { label: "قيد المراجعة", color: "bg-yellow-100 text-yellow-700 border-yellow-200", icon: <Clock className="w-3 h-3" /> };
    }
  };

  // حساب الإحصائيات بدقة (Case Insensitive)
  const stats = {
    total: templates.length,
    approved: templates.filter(t => t.status?.toUpperCase() === "APPROVED").length,
    pending: templates.filter(t => t.status?.toUpperCase() !== "APPROVED" && t.status?.toUpperCase() !== "REJECTED").length,
  };

  if (loading) return <div className="p-20 text-center animate-pulse text-gray-500">جاري تحميل القوالب...</div>;

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen" dir="rtl">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Layout className="w-6 h-6 text-blue-600" />
            إدارة قوالب واتساب
          </h1>
          <p className="text-sm text-gray-500 mt-1">إدارة ومزامنة القوالب المعتمدة من Meta</p>
        </div>

        <div className="flex gap-3 w-full md:w-auto">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex-1 md:flex-none bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
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
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {templates.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {templates.map((t) => {
              const status = getStatusDetails(t.status);
              return (
                <div key={t.id} className="p-5 hover:bg-gray-50 transition-colors flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      <h3 className="font-bold text-gray-900">{t.name}</h3>
                      <span className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${status.color}`}>
                        {status.icon}
                        {status.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 uppercase tracking-wider">{t.language} • {t.category}</p>
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{t.content}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-center">
                    <button
                      onClick={() => handleDelete(t.id)}
                      className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-all"
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
            <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Layout className="w-8 h-8 text-gray-300" />
            </div>
            <p className="text-gray-500 font-medium">لا توجد قوالب معروضة حالياً</p>
            <p className="text-sm text-gray-400 mt-1">تأكد من ربط حسابك ثم اضغط على زر المزامنة</p>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: "blue" | "green" | "yellow" }) {
  const colors = {
    blue: "border-blue-500 text-blue-700 bg-blue-50/30",
    green: "border-green-500 text-green-700 bg-green-50/30",
    yellow: "border-yellow-500 text-yellow-700 bg-yellow-50/30",
  };
  return (
    <div className={`p-5 rounded-2xl border-r-4 shadow-sm bg-white ${colors[color]}`}>
      <p className="text-xs text-gray-500 font-medium mb-1">{label}</p>
      <p className="text-3xl font-bold">{value}</p>
    </div>
  );
}