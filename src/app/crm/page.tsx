"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { UserPlus, FileSpreadsheet, Sheet } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/lib/language-context";
import { tx, type CrmContact, type CrmChannel, type CrmListResponse } from "./types";
import CrmStatsBar from "./_components/CrmStatsBar";
import CrmContactsTable from "./_components/CrmContactsTable";
import AddCrmContactModal from "./_components/AddCrmContactModal";
import CrmContactDetailModal from "./_components/CrmContactDetailModal";
import CrmExcelImportDialog from "./_components/CrmExcelImportDialog";
import CrmGoogleSheetsImportDialog from "./_components/CrmGoogleSheetsImportDialog";

const EMPTY_STATS = { total: 0, phoneOnly: 0, emailOnly: 0, both: 0 };

export default function CrmPage() {
  const { locale, dir } = useLanguage();
  const [items, setItems] = useState<CrmContact[]>([]);
  const [stats, setStats] = useState(EMPTY_STATS);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [channel, setChannel] = useState<CrmChannel>("all");

  const [addOpen, setAddOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [excelOpen, setExcelOpen] = useState(false);
  const [sheetsOpen, setSheetsOpen] = useState(false);

  // لينك خارجي (?contactId=) — يفتح مودال التفاصيل تلقائيًا على نفس العميل
  useEffect(() => {
    try {
      const id = new URLSearchParams(window.location.search).get("contactId");
      if (id) setDetailId(id);
    } catch {}
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);

  const fetchList = useCallback(async (p: number, ch: CrmChannel, q: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), pageSize: "50" });
      if (ch !== "all") params.set("channel", ch);
      if (q) params.set("q", q);
      const r = await fetch(`/api/crm/contacts?${params}`);
      const d = (await r.json().catch(() => ({}))) as Partial<CrmListResponse>;
      if (r.ok) {
        setItems(d.items ?? []);
        setStats(d.stats ?? EMPTY_STATS);
        setTotal(d.total ?? 0);
        setPage(d.page ?? 1);
        setPageCount(d.pageCount ?? 1);
      }
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchList(1, channel, debouncedSearch);
  }, [channel, debouncedSearch, fetchList]);

  const refresh = () => fetchList(page, channel, debouncedSearch);

  return (
    <div dir={dir}>
      {/* عنوان + أزرار */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900 dark:text-white">
            {tx("جهات الاتصال", "Contacts", locale)}
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {tx("عملاء الواتساب والإيميل في مكان واحد", "WhatsApp and email customers in one place", locale)}
          </p>
        </div>
        <div className="ms-auto flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => setSheetsOpen(true)}
            className="dark:border-gray-600 dark:text-gray-200 gap-1.5">
            <Sheet className="w-4 h-4 text-green-600" />
            {tx("شيت", "Sheets", locale)}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setExcelOpen(true)}
            className="dark:border-gray-600 dark:text-gray-200 gap-1.5">
            <FileSpreadsheet className="w-4 h-4 text-green-600" />
            {tx("إكسل", "Excel", locale)}
          </Button>
          <Button size="sm" onClick={() => setAddOpen(true)}
            className="bg-[#25D366] hover:bg-[#20bb5a] text-white gap-1.5">
            <UserPlus className="w-4 h-4" />
            {tx("إضافة عميل", "Add customer", locale)}
          </Button>
        </div>
      </div>

      <CrmStatsBar stats={stats} />

      <CrmContactsTable
        items={items}
        loading={loading}
        search={search}
        onSearch={(v) => setSearch(v)}
        channel={channel}
        onChannel={(c) => setChannel(c)}
        page={page}
        pageCount={pageCount}
        total={total}
        onPage={(p) => fetchList(p, channel, debouncedSearch)}
        onSelect={(id) => setDetailId(id)}
      />

      <AddCrmContactModal
        open={addOpen}
        onOpenChange={setAddOpen}
        onAdded={(_c, created) => {
          toast.success(
            created
              ? tx("اتضاف العميل", "Customer added", locale)
              : tx("العميل موجود — اتدمجت البيانات", "Customer exists — data merged", locale)
          );
          refresh();
        }}
      />

      <CrmContactDetailModal
        contactId={detailId}
        onClose={() => setDetailId(null)}
        onSaved={() => {
          toast.success(tx("اتحفظت البيانات", "Saved", locale));
          refresh();
        }}
        onDeleted={() => {
          toast.success(tx("اتمسح العميل", "Customer deleted", locale));
          refresh();
        }}
      />

      <CrmExcelImportDialog open={excelOpen} onOpenChange={setExcelOpen} onImported={refresh} />
      <CrmGoogleSheetsImportDialog open={sheetsOpen} onOpenChange={setSheetsOpen} onImported={refresh} />
    </div>
  );
}
