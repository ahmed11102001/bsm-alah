"use client";

import { useState } from "react";
import { X, UserPlus, Mail, User, Tag, Plus } from "lucide-react";
import { toast } from "sonner";
import type { EmailContactDTO } from "../../types";

export default function AddEmailContactModal({
  isOpen,
  onClose,
  onAdd,
}: {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (newContact: EmailContactDTO) => void;
}) {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) {
      toast.error("يرجى إدخال عنوان بريد إلكتروني صحيح");
      return;
    }

    setLoading(true);
    await new Promise((r) => setTimeout(r, 600));

    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const created: EmailContactDTO = {
      id: `cnt_${Date.now()}`,
      email: email.trim().toLowerCase(),
      firstName: firstName.trim() || null,
      lastName: lastName.trim() || null,
      tags: tags.length > 0 ? tags : ["عام"],
      status: "SUBSCRIBED",
      createdAt: new Date().toISOString(),
    };

    onAdd(created);
    setLoading(false);
    toast.success(`تمت إضافة ${email} بنجاح إلى جهات الاتصال! 🎉`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-red-600">
              <UserPlus className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">إضافة جهة اتصال جديدة</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">
              البريد الإلكتروني <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              required
              placeholder="customer@domain.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:border-red-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-red-500 font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">الاسم الأول</label>
              <input
                type="text"
                placeholder="أحمد"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:border-red-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-red-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">اسم العائلة</label>
              <input
                type="text"
                placeholder="خليل"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:border-red-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-red-500"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">
              الوسوم / المجموعات (افصل بفواصل)
            </label>
            <input
              type="text"
              placeholder="VIP, عملاء المتجر, مهتمين"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:border-red-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-red-500"
            />
            <span className="mt-1 block text-[10px] text-slate-500">
              تُستخدم الوسوم لتوجيه الحملات البريدية لشرائح مخصصة.
            </span>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 px-5 py-2 font-bold text-white shadow-lg shadow-red-500/20 transition-all hover:brightness-110 active:scale-95 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              <span>{loading ? "جاري الإضافة..." : "إضافة جهة الاتصال"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
