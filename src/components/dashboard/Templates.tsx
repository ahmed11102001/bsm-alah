"use client";
import { useState, useEffect } from "react";
import { Plus, Trash2 } from "lucide-react";

interface Template {
  id: string;
  name: string;
  content: string;
  status?: string;
  language?: string;
  category?: string;
  createdAt?: string;
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 1. جلب البيانات
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log("🔄 جاري جلب القوالب...");
        
        const res = await fetch("/api/templates");
        
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || "فشل تحميل القوالب");
        }
        
        const data = await res.json();
        console.log("✅ تم جلب القوالب:", data);
        
        // تأكد من أن البيانات هي array
        const validTemplates = Array.isArray(data) ? data : [];
        setTemplates(validTemplates);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "حدث خطأ في تحميل القوالب";
        console.error("❌ خطأ في جلب القوالب:", err);
        setError(errorMsg);
        setTemplates([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTemplates();
  }, []);

  // 2. إضافة قالب
  const addTemplate = async () => {
    try {
      console.log("📝 جاري إنشاء قالب جديد...");
      
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "قالب جديد",
          content: "رسالة جديدة 👋",
          category: "marketing",
          language: "ar",
          status: "pending"
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "فشل إنشاء القالب");
      }

      const data = await res.json();
      console.log("✅ تم إنشاء القالب:", data);
      
      setTemplates([data, ...templates]);
      alert("✅ تم إنشاء القالب بنجاح");
    } catch (error) {
      console.error("❌ خطأ في إنشاء القالب:", error);
      alert("❌ فشل إنشاء القالب: " + (error instanceof Error ? error.message : "خطأ غير معروف"));
    }
  };

  // 3. حذف قالب
  const deleteTemplate = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا القالب؟")) return;

    try {
      console.log("🗑️ جاري حذف القالب:", id);
      
      const res = await fetch("/api/templates", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "فشل حذف القالب");
      }

      console.log("✅ تم حذف القالب");
      
      setTemplates(templates.filter((t) => t.id !== id));
      alert("✅ تم حذف القالب بنجاح");
    } catch (error) {
      console.error("❌ خطأ في حذف القالب:", error);
      alert("❌ فشل حذف القالب: " + (error instanceof Error ? error.message : "خطأ غير معروف"));
    }
  };

  const stats = {
    total: Array.isArray(templates) ? templates.length : 0,
    approved: Array.isArray(templates) ? templates.filter((t) => t.status === "approved").length : 0,
    pending: Array.isArray(templates) ? templates.filter((t) => t.status === "pending").length : 0,
    rejected: Array.isArray(templates) ? templates.filter((t) => t.status === "rejected").length : 0
  };

  if (loading) {
    return (
      <div className="p-10 text-center font-bold text-blue-600">
        جاري تحميل القوالب...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-10 text-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700 font-bold">❌ {error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
          >
            إعادة محاولة
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen text-right font-sans" dir="rtl">
      
      {/* Header */}
      <div className="flex justify-between items-center bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          إدارة القوالب
        </h1>
        <button
          onClick={addTemplate}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl font-bold shadow-md transition-all flex items-center gap-2"
        >
          <span>+ إنشاء قالب</span>
        </button>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="إجمالي القوالب" value={stats.total} color="blue" />
        <StatCard label="المعتمدة" value={stats.approved} color="green" />
        <StatCard label="قيد المراجعة" value={stats.pending} color="yellow" />
        <StatCard label="المرفوضة" value={stats.rejected} color="red" />
      </div>

      {/* Templates List */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden text-right">
        {templates && templates.length > 0 ? (
          templates.map((t) => (
            <div
              key={t.id}
              className="p-5 border-b last:border-0 hover:bg-gray-50 flex justify-between items-center transition-colors"
            >
              <div className="flex-1">
                <h3 className="font-bold text-gray-800">{t.name ?? "بدون اسم"}</h3>
                <p className="text-xs text-gray-500 mt-1 uppercase tracking-wide">
                  {t.language ?? "ar"} • {t.category ?? "marketing"}
                </p>
                <p className="text-sm text-gray-600 mt-2 bg-gray-100 p-2 rounded-lg">
                  {t.content ?? "بدون محتوى"}
                </p>
              </div>

              <div className="flex flex-col items-end gap-4 ml-4">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold border ${
                    t.status === "approved"
                      ? "bg-green-100 text-green-700 border-green-200"
                      : t.status === "rejected"
                      ? "bg-red-100 text-red-700 border-red-200"
                      : "bg-yellow-100 text-yellow-700 border-yellow-200"
                  }`}
                >
                  {t.status === "approved"
                    ? "معتمد ✅"
                    : t.status === "rejected"
                    ? "مرفوض ❌"
                    : "قيد المراجعة ⏳"}
                </span>
                <button
                  onClick={() => deleteTemplate(t.id)}
                  className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-full transition-all"
                  title="حذف"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="p-8 text-center text-gray-500">
            <p className="text-lg font-semibold">لا توجد قوالب حالياً</p>
            <p className="text-sm mt-2">اضغط على زر "إنشاء قالب" لإنشاء قالب جديد</p>
          </div>
        )}
      </div>
    </div>
  );
}

// مكون الكارت عشان الكود يبقى نظيف
function StatCard({ label, value, color }: { label: string; value: number; color: "blue" | "green" | "yellow" | "red"; }) {
  const colors = {
    blue: "border-blue-500 text-blue-700",
    green: "border-green-500 text-green-700",
    yellow: "border-yellow-500 text-yellow-700",
    red: "border-red-500 text-red-700"
  };
  return (
    <div className={`bg-white p-4 rounded-xl border-r-4 shadow-sm ${colors[color]}`}>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}