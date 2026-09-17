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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#04241b] p-6 shadow-2xl backdrop-blur-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/20 text-blue-300">
              <UserPlus className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-white">إضافة جهة اتصال جديدة</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-white/40 hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-white/80 mb-1.5">
              البريد الإلكتروني <span className="text-red-400">*</span>
            </label>
            <input
              type="email"
              required
              placeholder="customer@domain.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs text-white placeholder-white/30 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-white/80 mb-1.5">الاسم الأول</label>
              <input
                type="text"
                placeholder="أحمد"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs text-white placeholder-white/30 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-white/80 mb-1.5">اسم العائلة</label>
              <input
                type="text"
                placeholder="خليل"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs text-white placeholder-white/30 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-white/80 mb-1.5">
              الوسوم / المجموعات (افصل بفواصل)
            </label>
            <input
              type="text"
              placeholder="VIP, عملاء المتجر, مهتمين"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs text-white placeholder-white/30 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <span className="mt-1 block text-[10px] text-white/40">
              تُستخدم الوسوم لتوجيه الحملات البريدية لشرائح مخصصة.
            </span>
          </div>

          <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 font-medium text-white/60 hover:bg-white/5 hover:text-white"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2 font-bold text-white shadow-lg shadow-blue-500/20 transition-all hover:brightness-110 active:scale-95 disabled:opacity-50"
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
