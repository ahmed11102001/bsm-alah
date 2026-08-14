"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, RefreshCw, Sheet } from "lucide-react";
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
type SheetTab = { sheetId?: number | null; title?: string | null; rowCount?: number | null };
type Preview = {
  spreadsheetName: string;
  sheetName: string;
  headers: { index: number; value: string }[];
  rows: string[][];
  rowCount: number | null;
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

  const getError = async (response: Response) => (await response.json().catch(() => ({}))).error || text("حدث خطأ غير متوقع", "Something went wrong", locale);

  useEffect(() => {
    if (!open || !connection) return;
    setError(""); setLoading(true);
    fetch(`/api/google-sheets/spreadsheets?connectionId=${encodeURIComponent(connection.id)}`)
      .then(async (r) => { if (!r.ok) throw new Error(await getError(r)); return r.json(); })
      .then((data) => setSpreadsheets(data.spreadsheets ?? []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [open, connection]);

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

  const doImport = async () => {
    if (!connection || !preview) return;
    setImporting(true); setError("");
    try {
      const r = await fetch("/api/google-sheets/import", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionId: connection.id, spreadsheetId, spreadsheetName, sheetId: tabs.find((tab) => tab.title === sheetName)?.sheetId, sheetName, nameColumn, phoneColumn }),
      });
      if (!r.ok) throw new Error(await getError(r));
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
        {!connection ? (
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
              <div className="flex items-center justify-between text-sm text-gray-500"><span>{text("عدد الصفوف", "Rows", locale)}: {preview.rowCount ?? "—"}</span><Button onClick={doImport} disabled={importing || !nameColumn || !phoneColumn} className="bg-[#25D366] hover:bg-[#1fb956] text-white">{importing && <Loader2 className="w-4 h-4 animate-spin" />}{text("استيراد", "Import", locale)}</Button></div>
            </>}
            {error && <p className="text-sm text-red-500">{error}</p>}
            {!loading && spreadsheets.length === 0 && <p className="text-sm text-gray-500">{text("لا توجد ملفات Google Sheets متاحة.", "No accessible Google Sheets found.", locale)}</p>}
            {loading && <RefreshCw className="w-4 h-4 animate-spin text-green-500" />}
          </div>
        )}
        {error && !connection && <p className="text-sm text-red-500">{error}</p>}
      </DialogContent>
    </Dialog>
  );
}
