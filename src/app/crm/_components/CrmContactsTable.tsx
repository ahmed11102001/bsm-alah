"use client";

import { Search, MessageCircle, Mail, ChevronLeft, ChevronRight, Users } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { tx, type CrmContact, type CrmChannel } from "../types";

interface Props {
  items: CrmContact[];
  loading: boolean;
  search: string;
  onSearch: (v: string) => void;
  channel: CrmChannel;
  onChannel: (c: CrmChannel) => void;
  page: number;
  pageCount: number;
  total: number;
  onPage: (p: number) => void;
  onSelect: (id: string) => void;
}

const CHANNELS: CrmChannel[] = ["all", "phone", "email", "both"];

export default function CrmContactsTable(props: Props) {
  const { items, loading, search, onSearch, channel, onChannel, page, pageCount, total, onPage, onSelect } = props;
  const { locale, dir } = useLanguage();

  const channelLabel: Record<CrmChannel, string> = {
    all: tx("الكل", "All", locale),
    phone: tx("رقم بس", "Phone only", locale),
    email: tx("إيميل بس", "Email only", locale),
    both: tx("الاتنين", "Both", locale),
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden" dir={dir}>
      {/* أدوات */}
      <div className="p-4 flex flex-col sm:flex-row gap-3 sm:items-center border-b border-gray-100 dark:border-gray-700">
        <div className="relative flex-1">
          <Search className="absolute start-3 top-3 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder={tx("بحث بالاسم أو الرقم أو الإيميل…", "Search name, phone or email…", locale)}
            className="w-full h-10 ps-9 pe-3 text-sm rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#25D366]/40"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {CHANNELS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onChannel(c)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                channel === c
                  ? "bg-[#25D366] text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:opacity-80"
              }`}
            >
              {channelLabel[c]}
            </button>
          ))}
        </div>
      </div>

      {/* الجدول */}
      {loading ? (
        <div className="p-4 space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 rounded-xl bg-gray-100 dark:bg-gray-700 animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="p-12 text-center">
          <Users className="w-8 h-8 text-gray-200 dark:text-gray-600 mx-auto mb-2" />
          <p className="text-sm text-gray-400 dark:text-gray-500">
            {tx("لا توجد جهات اتصال — ضيف أول عميل أو استورد ملف", "No contacts yet — add your first customer or import a file", locale)}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
              <tr>
                {[tx("الاسم", "Name", locale), tx("الرقم", "Phone", locale), tx("الإيميل", "Email", locale), tx("القناة", "Channel", locale), tx("التاجز", "Tags", locale), tx("أُضيف", "Added", locale)].map((h, i) => (
                  <th key={i} className="text-start py-3 px-3 font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => onSelect(c.id)}
                  className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition cursor-pointer"
                >
                  <td className="py-3 px-3 font-medium text-gray-900 dark:text-white">{c.name || "—"}</td>
                  <td className="py-3 px-3 text-gray-600 dark:text-gray-300 text-xs font-mono" dir="ltr">{c.phone || "—"}</td>
                  <td className="py-3 px-3 text-gray-600 dark:text-gray-300 text-xs font-mono" dir="ltr">{c.email || "—"}</td>
                  <td className="py-3 px-3">
                    <span className="flex items-center gap-1.5">
                      {c.phone && (
                        <span title="WhatsApp" className="w-6 h-6 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                          <MessageCircle className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                        </span>
                      )}
                      {c.email && (
                        <span title="Email" className="w-6 h-6 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                          <Mail className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    {c.tags.length === 0 ? (
                      <span className="text-gray-300 dark:text-gray-600">—</span>
                    ) : (
                      <span className="flex gap-1 flex-wrap">
                        {c.tags.slice(0, 3).map((t) => (
                          <span key={t} className="text-[11px] bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full whitespace-nowrap">{t}</span>
                        ))}
                        {c.tags.length > 3 && <span className="text-[11px] text-gray-400">+{c.tags.length - 3}</span>}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-gray-400 dark:text-gray-500 text-xs whitespace-nowrap">
                    {new Date(c.createdAt).toLocaleDateString(locale === "ar" ? "ar-EG" : "en-US")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* صفحات */}
      {pageCount > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
          <span>{tx(`الإجمالي: ${total}`, `Total: ${total}`, locale)}</span>
          <span className="flex items-center gap-2">
            <button
              type="button" disabled={page <= 1} onClick={() => onPage(page - 1)}
              className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-600 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <ChevronRight className={`w-4 h-4 ${locale === "ar" ? "" : "rotate-180"}`} />
            </button>
            <span>{tx(`صفحة ${page} من ${pageCount}`, `Page ${page} of ${pageCount}`, locale)}</span>
            <button
              type="button" disabled={page >= pageCount} onClick={() => onPage(page + 1)}
              className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-600 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <ChevronLeft className={`w-4 h-4 ${locale === "ar" ? "" : "rotate-180"}`} />
            </button>
          </span>
        </div>
      )}
    </div>
  );
}
