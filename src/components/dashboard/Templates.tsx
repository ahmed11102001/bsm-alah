"use client";
import { useState, useEffect } from "react";
import { Plus, Trash2, CheckCircle, Clock, Layout } from "lucide-react"; // لو مستخدم أيقونات

export default function TemplatesPage() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);

  // 1. جلب البيانات
  useEffect(() => {
    fetch("/api/templates")
      .then((res) => res.json())
      .then((data) => {
        setTemplates(data);
        setLoading(false);
      })
      .catch((err) => console.error(err));
  }, []);

  // 2. إضافة قالب (تجريبي)
  const addTemplate = async () => {
    const res = await fetch("/api/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "new_template",
        content: "رسالة جديدة 👋",
        category: "marketing",
        language: "ar"
      })
    });
    const data = await res.json();
    setTemplates([data, ...templates]);
  };

  // 3. حذف قالب
  const deleteTemplate = async (id) => {
    await fetch("/api/templates", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id })
    });
    setTemplates(templates.filter((t) => t.id !== id));
  };

  const stats = {
    total: templates.length,
    approved: templates.filter((t) => t.status === "approved").length,
    pending: templates.filter((t) => t.status === "pending").length,
    rejected: templates.filter((t) => t.status === "rejected").length
  };

  if (loading) return <div className="p-10 text-center font-bold text-blue-600">جاري تحميل القوالب...</div>;

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

      {/* Templates Table/List */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden text-right">
        {templates.map((t) => (
          <div key={t.id} className="p-5 border-b last:border-0 hover:bg-gray-50 flex justify-between items-center transition-colors">
            <div>
              <h3 className="font-bold text-gray-800">{t.name}</h3>
              <p className="text-xs text-gray-500 mt-1 uppercase tracking-wide">
                {t.language} • {t.category}
              </p>
              <p className="text-sm text-gray-600 mt-2 bg-gray-100 p-2 rounded-lg">{t.content}</p>
            </div>

            <div className="flex flex-col items-end gap-4">
              <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                t.status === "approved" ? "bg-green-100 text-green-700 border-green-200" : "bg-yellow-100 text-yellow-700 border-yellow-200"
              }`}>
                {t.status === "approved" ? "معتمد ✅" : "قيد المراجعة ⏳"}
              </span>
              <button
                onClick={() => deleteTemplate(t.id)}
                className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-full transition-all"
                title="حذف"
              >
                حذف
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// مكون الكارت عشان الكود يبقى نظيف
function StatCard({ label, value, color }) {
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