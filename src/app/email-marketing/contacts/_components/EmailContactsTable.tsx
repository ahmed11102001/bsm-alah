"use client";

import { useState } from "react";
import { Search, Filter, Mail, CheckCircle2, XCircle, AlertCircle, Tag, Plus, Upload, ExternalLink } from "lucide-react";
import EmailContactRowActions from "./EmailContactRowActions";
import type { EmailContactDTO, EmailContactStatus } from "../../types";

export default function EmailContactsTable({
  contacts,
  onDelete,
  onStatusChange,
  onOpenAddModal,
  onOpenImportModal,
}: {
  contacts: EmailContactDTO[];
  onDelete: (id: string) => void;
  onStatusChange: (id: string, newStatus: EmailContactStatus) => void;
  onOpenAddModal: () => void;
  onOpenImportModal: () => void;
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const filtered = contacts.filter((c) => {
    const matchesSearch =
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      (c.firstName && c.firstName.toLowerCase().includes(search.toLowerCase())) ||
      (c.lastName && c.lastName.toLowerCase().includes(search.toLowerCase())) ||
      c.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus = statusFilter === "ALL" || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: EmailContactStatus) => {
    switch (status) {
      case "SUBSCRIBED":
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
            <CheckCircle2 className="h-3 w-3" />
            مشترك نشط
          </span>
        );
      case "UNSUBSCRIBED":
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-[11px] font-bold text-amber-700">
            <XCircle className="h-3 w-3" />
            ملغي الاشتراك
          </span>
        );
      case "BOUNCED":
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 border border-rose-200 px-2 py-0.5 text-[11px] font-bold text-rose-700">
            <AlertCircle className="h-3 w-3" />
            مرتد (Bounced)
          </span>
        );
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
      {/* Top Bar: Filters + Search + Actions */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-5 border-b border-slate-100">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 max-w-xl">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute right-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="بحث بالبريد، الاسم، أو الوسم..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 pr-10 pl-4 py-2 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 font-mono"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 focus:border-red-500 focus:outline-none"
          >
            <option value="ALL">جميع الحالات</option>
            <option value="SUBSCRIBED">المشتركون النشطون</option>
            <option value="UNSUBSCRIBED">الملغى اشتراكهم</option>
            <option value="BOUNCED">المرتدون (Bounced)</option>
          </select>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={onOpenImportModal}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
          >
            <Upload className="h-3.5 w-3.5" />
            <span>استيراد ملف</span>
          </button>

          <button
            type="button"
            onClick={onOpenAddModal}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-red-500/25 hover:from-red-700 hover:to-rose-700 active:scale-95 transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>إضافة جهة اتصال</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-right text-xs text-slate-700">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] text-slate-500 uppercase">
              <th className="py-2.5 pr-3">البريد الإلكتروني</th>
              <th className="py-2.5 px-3">الاسم</th>
              <th className="py-2.5 px-3">الوسوم (Tags)</th>
              <th className="py-2.5 px-3">الحالة</th>
              <th className="py-2.5 px-3">تاريخ الإضافة</th>
              <th className="py-2.5 pl-3 text-center">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400">
                  لا توجد جهات اتصال تطابق معايير البحث الحالية.
                </td>
              </tr>
            ) : (
              filtered.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 pr-3 font-mono font-semibold text-slate-900">
                    {c.email}
                  </td>
                  <td className="py-3.5 px-3">
                    {c.firstName || c.lastName ? (
                      <span className="text-slate-800 font-medium">
                        {c.firstName} {c.lastName}
                      </span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className="py-3.5 px-3">
                    <div className="flex flex-wrap gap-1">
                      {c.tags.map((t) => (
                        <span
                          key={t}
                          className="rounded-md border border-red-100 bg-red-50 px-1.5 py-0.5 text-[10px] text-red-700 font-medium"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3.5 px-3">{getStatusBadge(c.status)}</td>
                  <td className="py-3.5 px-3 text-slate-400 text-[11px]">
                    {new Date(c.createdAt).toLocaleDateString("ar-EG", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="py-3.5 pl-3 text-center">
                    <span className="inline-flex items-center gap-1">
                      <a
                        href={`/crm?contactId=${c.id}`}
                        target="_blank"
                        rel="noreferrer"
                        title="عرض في CRM"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                      <EmailContactRowActions
                        contact={c}
                        onDelete={onDelete}
                        onStatusChange={onStatusChange}
                      />
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Summary Footer */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
        <span>عرض {filtered.length} من إجمالي {contacts.length} جهة اتصال</span>
        <span>قناة الإيميل (قائمة بريدية معزولة تمامًا)</span>
      </div>
    </div>
  );
}
