"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2, Sheet, CheckCircle2, Link2 } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { tx, type ImportSummary, type SheetPreview } from "../types";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onImported: () => void;
}

export default function CrmGoogleSheetsImportDialog({ open, onOpenChange, onImported }: Props) {
  const { locale, dir } = useLanguage();
  const [url, setUrl] = useState("");
  const [preview, setPreview] = useState<SheetPreview | null>(null);
  const [nameCol, setNameCol] = useState<number | "">("");
  const [phoneCol, setPhoneCol] = useState<number | "">("");
  const [emailCol, setEmailCol] = useState<number | "">("");
  const [birthCol, setBirthCol] = useState<number | "">("");
  const [cityCol, setCityCol] = useState<number | "">("");
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [err, setErr] = useState("");
  const [summary, setSummary] = useState<ImportSummary | null>(null);

  const reset = () => {
    setPreview(null); setNameCol(""); setPhoneCol(""); setEmailCol("");
    setBirthCol(""); setCityCol("");
    setErr(""); setSummary(null);
  };

  const loadPreview = async () => {
    if (!url.trim()) {
      setErr(tx("ابعت لينك الشيت الأول", "Paste the sheet link first", locale));
      return;
    }
    setLoading(true); setErr(""); setSummary(null); setPreview(null);
    try {
      const r = await fetch("/api/crm/contacts/import/google-sheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "preview", url: url.trim() }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || tx("تعذر قراءة الشيت", "Failed to read sheet", locale));
      const p = d as SheetPreview;
      setPreview(p);
      setNameCol(p.headers[0]?.index ?? "");
      setPhoneCol(p.headers[1]?.index ?? "");
      setEmailCol(p.headers[2]?.index ?? "");
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  const doImport = async () => {
    if (phoneCol === "" && emailCol === "") {
      setErr(tx("حدد عمود الرقم أو عمود الإيميل على الأقل", "Map a phone or email column", locale));
      return;
    }
    setImporting(true); setErr("");
    try {
      const r = await fetch("/api/crm/contacts/import/google-sheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "import",
          url: url.trim(),
          mapping: {
            nameCol: nameCol === "" ? undefined : nameCol,
            phoneCol: phoneCol === "" ? undefined : phoneCol,
            emailCol: emailCol === "" ? undefined : emailCol,
            birthCol: birthCol === "" ? undefined : birthCol,
            cityCol: cityCol === "" ? undefined : cityCol,
          },
        }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || tx("تعذر الاستيراد", "Import failed", locale));
      setSummary(d.summary);
      onImported();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { reset(); } onOpenChange(v); }}>
      <DialogContent className="max-w-2xl dark:bg-gray-800 dark:border-gray-700" dir={dir}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 dark:text-white">
            <Sheet className="w-5 h-5 text-green-600" />
            {tx("استيراد من Google Sheets (مرة واحدة)", "Import from Google Sheets (one-time)", locale)}
          </DialogTitle>
          <DialogDescription className="dark:text-gray-400">
            {tx("الصق لينك الشيت (لازم يكون متشير Anyone with the link) وحدد الأعمدة — الاستيراد لمرة واحدة بدون مزامنة.", "Paste the sheet link (must be shared as Anyone with the link) and map columns — one-time import, no sync.", locale)}
          </DialogDescription>
        </DialogHeader>

        {summary ? (
          <div className="space-y-3 py-2">
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <CheckCircle2 className="w-5 h-5" />
              <p className="font-bold">{tx("خلص الاستيراد", "Import finished", locale)}</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              {[
                { l: tx("الإجمالي", "Total", locale), v: summary.total },
                { l: tx("اتضاف", "Added", locale), v: summary.added },
                { l: tx("اتحدّث", "Updated", locale), v: summary.updated },
                { l: tx("اتجاهل", "Skipped", locale), v: summary.skipped },
              ].map((s) => (
                <div key={s.l} className="rounded-xl bg-gray-50 dark:bg-gray-700/50 p-3">
                  <p className="text-xl font-extrabold text-gray-900 dark:text-white">{s.v.toLocaleString()}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{s.l}</p>
                </div>
              ))}
            </div>
            {summary.skippedSamples.length > 0 && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {tx("صفوف متجاهلة (من غير رقم ولا إيميل): ", "Skipped rows (no phone or email): ", locale)}
                {summary.skippedSamples.slice(0, 10).map((s) => `#${s.row}`).join("، ")}
              </p>
            )}
            {(summary.invalidBirthDates ?? 0) > 0 && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                {tx(
                  `تواريخ ميلاد غير صالحة (اتجاهل الحقل بس): ${summary.invalidBirthDates} — صفوف ${(summary.invalidBirthDateRows ?? []).slice(0, 10).map((n) => `#${n}`).join("، ")}`,
                  `Invalid birth dates (field skipped only): ${summary.invalidBirthDates} — rows ${(summary.invalidBirthDateRows ?? []).slice(0, 10).map((n) => `#${n}`).join(", ")}`,
                  locale
                )}
              </p>
            )}
            <Button onClick={() => { onOpenChange(false); reset(); }} className="w-full bg-[#25D366] hover:bg-[#20bb5a] text-white">
              {tx("تم", "Done", locale)}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Link2 className="absolute start-3 top-3 w-4 h-4 text-gray-400" />
                <Input
                  value={url} onChange={(e) => setUrl(e.target.value)} dir="ltr"
                  placeholder="https://docs.google.com/spreadsheets/d/…"
                  className="ps-9 dark:bg-gray-700 dark:border-gray-600 text-sm font-mono"
                />
              </div>
              <Button onClick={loadPreview} disabled={loading} variant="outline" className="dark:border-gray-600 flex-shrink-0">
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {tx("عرض", "Load", locale)}
              </Button>
            </div>

            {preview && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { l: tx("عمود الاسم", "Name column", locale), v: nameCol, s: setNameCol },
                    { l: tx("عمود الرقم", "Phone column", locale), v: phoneCol, s: setPhoneCol },
                    { l: tx("عمود الإيميل", "Email column", locale), v: emailCol, s: setEmailCol },
                    { l: tx("عمود تاريخ الميلاد", "Birth date column", locale), v: birthCol, s: setBirthCol },
                    { l: tx("عمود المدينة", "City column", locale), v: cityCol, s: setCityCol },
                  ].map((f) => (
                    <label key={f.l} className="text-sm dark:text-gray-200">
                      {f.l} <span className="text-gray-400">({tx("اختياري", "optional", locale)})</span>
                      <select
                        value={f.v} onChange={(e) => f.s(e.target.value === "" ? "" : Number(e.target.value))}
                        className="mt-1 w-full rounded-lg border p-2 bg-white dark:bg-gray-700 dark:border-gray-600 text-sm"
                      >
                        <option value="">—</option>
                        {preview.headers.map((h) => (
                          <option key={h.index} value={h.index}>{h.value || `Column ${h.index + 1}`}</option>
                        ))}
                      </select>
                    </label>
                  ))}
                </div>
                <div className="rounded-xl border dark:border-gray-700 overflow-auto max-h-44">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>{preview.headers.slice(0, 6).map((h) => <th key={h.index} className="p-2 text-start whitespace-nowrap">{h.value || `Column ${h.index + 1}`}</th>)}</tr>
                    </thead>
                    <tbody>
                      {preview.rows.slice(0, 5).map((r, i) => (
                        <tr key={i} className="border-t dark:border-gray-700">
                          {preview.headers.slice(0, 6).map((h) => <td key={h.index} className="p-2 whitespace-nowrap text-gray-600 dark:text-gray-300">{r[h.index] ?? ""}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {tx(`صفوف في الشيت: ${preview.rowCount}`, `Rows in sheet: ${preview.rowCount}`, locale)}
                  </span>
                  <Button onClick={doImport} disabled={importing} className="bg-[#25D366] hover:bg-[#20bb5a] text-white">
                    {importing && <Loader2 className="w-4 h-4 animate-spin" />}
                    {tx("استيراد", "Import", locale)}
                  </Button>
                </div>
              </>
            )}
            {err && <p className="text-sm text-red-500">{err}</p>}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
