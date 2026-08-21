"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, RefreshCw, Sheet, Lock } from "lucide-react";
import { useLanguage } from "@/lib/language-context";

type Connection = {
  id: string;
  spreadsheetId: string | null;
  spreadsheetName: string | null;
  sheetId: string | null;
  sheetName: string | null;
  nameColumn: string | null;
  phoneColumn: string | null;
};
type Spreadsheet = { id?: string | null; name?: string | null; modifiedTime?: string | null };
type SheetTab = { sheetId?: number | null; title?: string | null };
type Preview = {
  spreadsheetName: string;
  sheetName: string;
  headers: { index: number; value: string }[];
  rows: string[][];
  rowCount: number | null;
  limitInfo?: { currentContacts: number; newContacts: number; availableSlots: number | null; unlimited: boolean };
};

const text = (ar: string, en: string, locale: string) => locale === "ar" ? ar : en;

export function GoogleSheetsImportDialog({
  open, onOpenChange, connection, onImported,
}: { open: boolean; onOpenChange: (open: boolean) => void; connection: Connection | null; onImported: () => void }) {
  const { locale, dir } = useLanguage();
  const [spreadsheets, setSpreadsheets] = useState<Spreadsheet[]>([]);
  const [spreadsheetId, setSpreadsheetId] = useState("");
  const [spreadsheetName, setSpreadsheetName] = useState("");
  const [tabs, setTabs] = useState<SheetTab[]>([]);
  const [sheetName, setSheetName] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [nameColumn, setNameColumn] = useState("");
  const [phoneColumn, setPhoneColumn] = useState("");
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  const [featureLocked, setFeatureLocked] = useState(false);
  const [limitPrompt, setLimitPrompt] = useState<{ newContacts: number; availableSlots: number } | null>(null);

  const getError = async (response: Response) => (await response.json().catch(() => ({}))).error || text("حدث خطأ غير متوقع", "Something went wrong", locale);

  useEffect(() => {
    if (!open) return;
    setError(""); setFeatureLocked(false); setSpreadsheets([]);
    setSpreadsheetId(""); setSpreadsheetName(""); setTabs([]); setSheetName(""); setPreview(null);

    setLoading(true);
    const connectionId = connection?.id ? `?connectionId=${encodeURIComponent(connection.id)}` : "";
    fetch(`/api/google-sheets/connection${connectionId}`)
      .then(async (r) => {
        if (r.status === 403) {
          const data = await r.json().catch(() => ({}));
          setFeatureLocked(data.code === "FEATURE_LOCKED");
          if (data.code === "FEATURE_LOCKED") return null;
        }
        if (!r.ok) throw new Error(await getError(r));
        return r.json();
      })
      .then((data) => {
        if (!data || featureLocked) return;
        // The parent connection is authoritative when present; otherwise this also
        // supports reopening the dialog after a redirect.
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [open, connection?.id]);

  useEffect(() => {
    if (!open || featureLocked || !connection) return;
    setLoading(true);
    fetch(`/api/google-sheets/spreadsheets?connectionId=${encodeURIComponent(connection.id)}`)
      .then(async (r) => { if (!r.ok) throw new Error(await getError(r)); return r.json(); })
      .then((data) => setSpreadsheets(data.spreadsheets ?? []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [open, featureLocked, connection?.id]);

  const chooseSpreadsheet = async (id: string) => {
    setSpreadsheetId(id); setSpreadsheetName(spreadsheets.find((item) => item.id === id)?.name ?? "");
    setTabs([]); setSheetName(""); setPreview(null); setError("");
    if (!id || !connection) return;
    setLoading(true);
    try {
      const r = await fetch(`/api/google-sheets/sheets?connectionId=${encodeURIComponent(connection.id)}&spreadsheetId=${encodeURIComponent(id)}`);
      if (!r.ok) throw new Error(await getError(r));
      setTabs((await r.json()).sheets ?? []);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const chooseSheet = async (name: string) => {
    setSheetName(name); setPreview(null); setError("");
    if (!name || !connection || !spreadsheetId) return;
    setLoading(true);
    try {
      const query = new URLSearchParams({ connectionId: connection.id, spreadsheetId, sheetName: name });
      const r = await fetch(`/api/google-sheets/preview?${query}`);
      if (!r.ok) throw new Error(await getError(r));
      const data = await r.json() as Preview;
      setPreview(data);
      setNameColumn(connection.nameColumn ?? data.headers[0]?.value ?? "");
      setPhoneColumn(connection.phoneColumn ?? data.headers[1]?.value ?? "");
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (!preview || !connection || !spreadsheetId || !sheetName || !phoneColumn || featureLocked) return;
    const query = new URLSearchParams({ connectionId: connection.id, spreadsheetId, sheetName, phoneColumn });
    fetch(`/api/google-sheets/preview?${query}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data && typeof data.rowCount === "number") setPreview((current) => current ? { ...current, rowCount: data.rowCount, limitInfo: data.limitInfo } : current); })
      .catch(() => {});
  }, [preview?.sheetName, phoneColumn, connection?.id, spreadsheetId, sheetName, featureLocked]);

  const doImport = async (allowPartial = false) => {
    if (!connection || !preview || featureLocked) return;
    setImporting(true); setError(""); setLimitPrompt(null);
    try {
      const r = await fetch("/api/google-sheets/import", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionId: connection.id, spreadsheetId, spreadsheetName, sheetId: tabs.find((tab) => tab.title === sheetName)?.sheetId, sheetName, nameColumn, phoneColumn, allowPartial }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        if (r.status === 403 && data.code === "FEATURE_LOCKED") { setFeatureLocked(true); return; }
        if (r.status === 409 && data.code === "CONTACT_LIMIT" && Number(data.availableSlots) > 0) {
          setLimitPrompt({ newContacts: data.newContacts, availableSlots: data.availableSlots });
          return;
        }
        throw new Error(data.error || text("تعذر الاستيراد", "Import failed", locale));
      }
      onOpenChange(false); onImported();
    } catch (e: any) { setError(e.message); }
    finally { setImporting(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl dark:bg-gray-800 dark:border-gray-700" dir={dir}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 dark:text-white"><Sheet className="w-5 h-5 text-green-600" /> {text("استيراد من Google Sheets", "Import from Google Sheets", locale)}</DialogTitle>
          <DialogDescription className="dark:text-gray-400">{text("اختار الملف والصفحة ثم حدد عمود الاسم ورقم الهاتف.", "Choose a spreadsheet and map the name and phone columns.", locale)}</DialogDescription>
        </DialogHeader>

        {featureLocked ? (
          <div className="py-10 text-center space-y-4">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center"><Lock className="w-7 h-7 text-amber-500" /></div>
            <div>
              <p className="font-bold text-gray-900 dark:text-white">{text("Google Sheets متاحة للمشتركين فقط", "Google Sheets is available on paid plans", locale)}</p>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{text("قم بالترقية إلى Starter أو أعلى لاستيراد الجمهور ومزامنته من Google Sheets.", "Upgrade to Starter or higher to import and sync audiences from Google Sheets.", locale)}</p>
            </div>
          </div>
        ) : !connection ? (
          <div className="py-8 text-center space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-300">{text("اربط حساب Google أولاً للوصول إلى ملفاتك.", "Connect your Google account to access your spreadsheets.", locale)}</p>
            <Button className="bg-[#25D366] hover:bg-[#1fb956] text-white" onClick={() => { window.location.href = "/api/google-sheets/connect" }}>
              {text("ربط Google", "Connect Google", locale)}
            </Button>
          </div>
        ) : loading && !spreadsheets.length ? (
          <div className="flex justify-center py-10"><Loader2 className="w-7 h-7 animate-spin text-green-500" /></div>
        ) : (
          <div className="space-y-4">
            <label className="block text-sm dark:text-gray-200">{text("Spreadsheet", "Spreadsheet", locale)}
              <select value={spreadsheetId} onChange={(e) => chooseSpreadsheet(e.target.value)} className="mt-1 w-full rounded-lg border p-2 bg-white dark:bg-gray-700 dark:border-gray-600">
                <option value="">{text("اختار ملفًا", "Choose a spreadsheet", locale)}</option>
                {spreadsheets.map((item) => <option key={item.id} value={item.id ?? ""}>{item.name}</option>)}
              </select>
            </label>
            {!!tabs.length && <label className="block text-sm dark:text-gray-200">{text("Sheet / Tab", "Sheet / Tab", locale)}
              <select value={sheetName} onChange={(e) => chooseSheet(e.target.value)} className="mt-1 w-full rounded-lg border p-2 bg-white dark:bg-gray-700 dark:border-gray-600">
                <option value="">{text("اختار صفحة", "Choose a tab", locale)}</option>
                {tabs.map((tab) => <option key={tab.sheetId} value={tab.title ?? ""}>{tab.title}</option>)}
              </select>
            </label>}
            {preview && <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="text-sm dark:text-gray-200">{text("عمود الاسم", "Name column", locale)}
                  <select value={nameColumn} onChange={(e) => setNameColumn(e.target.value)} className="mt-1 w-full rounded-lg border p-2 bg-white dark:bg-gray-700 dark:border-gray-600">{preview.headers.map((h) => <option key={h.index} value={h.value}>{h.value || `Column ${h.index + 1}`}</option>)}</select>
                </label>
                <label className="text-sm dark:text-gray-200">{text("عمود الهاتف", "Phone column", locale)}
                  <select value={phoneColumn} onChange={(e) => setPhoneColumn(e.target.value)} className="mt-1 w-full rounded-lg border p-2 bg-white dark:bg-gray-700 dark:border-gray-600">{preview.headers.map((h) => <option key={h.index} value={h.value}>{h.value || `Column ${h.index + 1}`}</option>)}</select>
                </label>
              </div>
              <div className="rounded-xl border dark:border-gray-700 overflow-auto">
                <table className="w-full text-xs"><thead className="bg-gray-50 dark:bg-gray-700"><tr>{preview.headers.slice(0, 6).map((h) => <th key={h.index} className="p-2 text-start whitespace-nowrap">{h.value || `Column ${h.index + 1}`}</th>)}</tr></thead><tbody>{preview.rows.slice(0, 5).map((row, index) => <tr key={index} className="border-t dark:border-gray-700">{preview.headers.slice(0, 6).map((h) => <td key={h.index} className="p-2 whitespace-nowrap">{row[h.index] ?? ""}</td>)}</tr>)}</tbody></table>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">{text("يفضل ضبط عمود الهاتف في Google Sheets على Plain text للحفاظ على الصفر الأول.", "Set the phone column to Plain text in Google Sheets to preserve leading zeros.", locale)}</p>
              <div className="rounded-lg bg-gray-50 dark:bg-gray-700/50 p-3 text-xs space-y-1">
                <p>{text("جهات الاتصال في الشيت", "Contacts in sheet", locale)}: <strong>{preview.rowCount ?? 0}</strong></p>
                <p>{text("جهات اتصال جديدة", "New contacts", locale)}: <strong>{preview.limitInfo?.newContacts ?? preview.rowCount ?? 0}</strong></p>
                <p>{text("جهات الاتصال الحالية", "Current contacts", locale)}: <strong>{preview.limitInfo?.currentContacts ?? "—"}</strong></p>
                <p>{text("المتاح في الباقة", "Available in plan", locale)}: <strong>{preview.limitInfo?.unlimited ? text("غير محدود", "Unlimited", locale) : (preview.limitInfo?.availableSlots ?? "—")}</strong></p>
              </div>
              {preview.limitInfo && !preview.limitInfo.unlimited && preview.limitInfo.newContacts > (preview.limitInfo.availableSlots ?? 0) && <p className="rounded-lg bg-amber-50 dark:bg-amber-950/30 p-3 text-xs text-amber-700 dark:text-amber-300">{text("الشيت أكبر من المساحة المتاحة. عند المتابعة سيتم طلب تأكيد لاستيراد العدد المسموح فقط.", "The sheet exceeds the available plan space. Continuing will ask for confirmation to import only the allowed amount.", locale)}</p>}
              {limitPrompt && <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-3 space-y-2 text-sm text-amber-800 dark:text-amber-200"><p>{text(`الباقة تسمح بإضافة ${limitPrompt.availableSlots} جهة اتصال فقط، بينما الشيت يحتوي على ${limitPrompt.newContacts} جهة جديدة.`, `Your plan allows only ${limitPrompt.availableSlots} new contacts, while the sheet has ${limitPrompt.newContacts} new contacts.`, locale)}</p><div className="flex gap-2"><Button size="sm" onClick={() => doImport(true)} disabled={importing} className="bg-[#25D366] hover:bg-[#1fb956] text-white">{text(`استيراد ${limitPrompt.availableSlots} فقط`, `Import ${limitPrompt.availableSlots} only`, locale)}</Button><Button size="sm" variant="outline" onClick={() => setLimitPrompt(null)}>{text("إلغاء", "Cancel", locale)}</Button></div></div>}
              <div className="flex items-center justify-between text-sm text-gray-500"><span>{text("عدد العملاء", "Contacts", locale)}: {preview.rowCount ?? 0}</span><Button onClick={() => doImport(false)} disabled={importing || !nameColumn || !phoneColumn || !preview.rowCount || (!!preview.limitInfo && !preview.limitInfo.unlimited && preview.limitInfo.availableSlots === 0 && preview.limitInfo.newContacts > 0)} className="bg-[#25D366] hover:bg-[#1fb956] text-white">{importing && <Loader2 className="w-4 h-4 animate-spin" />}{locale === "ar" ? `استيراد ${preview.limitInfo?.newContacts ?? preview.rowCount ?? 0} عميل` : `Import ${preview.limitInfo?.newContacts ?? preview.rowCount ?? 0} contacts`}</Button></div>
            </>}
            {error && <p className="text-sm text-red-500">{error}</p>}
            {!loading && spreadsheets.length === 0 && <p className="text-sm text-gray-500">{text("لا توجد ملفات Google Sheets متاحة.", "No accessible Google Sheets found.", locale)}</p>}
            {loading && <RefreshCw className="w-4 h-4 animate-spin text-green-500" />}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
