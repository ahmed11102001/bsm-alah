"use client";

import { useRef, useState } from "react";
import ExcelJS from "exceljs";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2, Upload, FileSpreadsheet, CheckCircle2 } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { parseCsv } from "@/lib/csv";
import { tx, type ImportSummary } from "../types";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onImported: () => void;
}

function cellToString(v: any): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v.trim();
  if (typeof v === "number") return String(v);
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "object") {
    if (Array.isArray((v as any).richText)) return (v as any).richText.map((r: any) => r.text).join("");
    if ((v as any).text) return String((v as any).text);
    if ((v as any).result !== undefined) return cellToString((v as any).result);
  }
  return String(v).trim();
}

export default function CrmExcelImportDialog({ open, onOpenChange, onImported }: Props) {
  const { locale, dir } = useLanguage();
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [nameCol, setNameCol] = useState<number | "">("");
  const [phoneCol, setPhoneCol] = useState<number | "">("");
  const [emailCol, setEmailCol] = useState<number | "">("");
  const [birthCol, setBirthCol] = useState<number | "">("");
  const [cityCol, setCityCol] = useState<number | "">("");
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [err, setErr] = useState("");
  const [summary, setSummary] = useState<ImportSummary | null>(null);

  const reset = () => {
    setFileName(""); setHeaders([]); setRows([]);
    setNameCol(""); setPhoneCol(""); setEmailCol("");
    setBirthCol(""); setCityCol("");
    setErr(""); setSummary(null);
  };

  const guessCol = (head: string[], hints: string[]): number | "" => {
    for (let i = 0; i < head.length; i++) {
      const h = head[i].trim().toLowerCase();
      if (h && hints.some((hint) => h === hint || h.includes(hint))) return i;
    }
    return "";
  };

  const parseFile = async (file: File) => {
    setErr(""); setSummary(null); setParsing(true);
    try {
      if (!/\.(xlsx|xls|csv)$/i.test(file.name)) {
        throw new Error(tx("الملف لازم يكون xlsx أو csv", "File must be xlsx or csv", locale));
      }
      let grid: string[][];
      if (/\.csv$/i.test(file.name)) {
        grid = parseCsv(await file.text()).slice(0, 5001);
      } else {
        const buffer = await file.arrayBuffer();
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(buffer);
        const ws = workbook.worksheets[0];
        if (!ws) throw new Error(tx("الملف فاضي", "File is empty", locale));
        grid = [];
        ws.eachRow((row) => {
          const arr: string[] = [];
          row.eachCell((cell) => arr.push(cellToString((cell as any).value)));
          grid.push(arr);
          if (grid.length > 5001) return;
        });
      }
      if (grid.length < 2) throw new Error(tx("الملف فاضي أو مفيهوش بيانات", "File is empty", locale));
      const maxCols = Math.max(...grid.map((r) => r.length));
      const head = grid[0].map((h, i) => h.trim() || `${tx("عمود", "Column", locale)} ${i + 1}`);
      const body = grid.slice(1).map((r) => {
        const out = [...r];
        while (out.length < maxCols) out.push("");
        return out;
      });
      setHeaders(head);
      setRows(body);
      setFileName(file.name);
      const lower = head.map((h) => h.toLowerCase());
      const gName = guessCol(lower, ["name", "الاسم", "العميل", "customer", "client"]);
      const gPhone = guessCol(lower, ["phone", "mobile", "tel", "whatsapp", "الهاتف", "رقم", "الموبايل", "جوال"]);
      const gEmail = guessCol(lower, ["email", "mail", "الإيميل", "البريد", "ايميل"]);
      const gBirth = guessCol(lower, ["birth", "birthday", "dob", "ميلاد", "الميلاد", "تاريخ"]);
      const gCity = guessCol(lower, ["city", "town", "المدينة", "مدينة", "location"]);
      setNameCol(gName !== "" ? gName : (0 < maxCols ? 0 : ""));
      setPhoneCol(gPhone !== "" ? gPhone : (1 < maxCols ? 1 : ""));
      setEmailCol(gEmail !== "" ? gEmail : (2 < maxCols ? 2 : ""));
      setBirthCol(gBirth);
      setCityCol(gCity);
    } catch (e: any) {
      setErr(e.message || tx("تعذر قراءة الملف", "Failed to read file", locale));
    } finally {
      setParsing(false);
    }
  };

  const mappedRows = rows.map((r) => ({
    name: nameCol === "" ? undefined : r[nameCol],
    phone: phoneCol === "" ? undefined : r[phoneCol],
    email: emailCol === "" ? undefined : r[emailCol],
    birthDate: birthCol === "" ? undefined : r[birthCol],
    city: cityCol === "" ? undefined : r[cityCol],
  }));
  const validCount = mappedRows.filter((r) => (r.phone && String(r.phone).trim()) || (r.email && String(r.email).trim())).length;

  const doImport = async () => {
    if (phoneCol === "" && emailCol === "") {
      setErr(tx("حدد عمود الرقم أو عمود الإيميل على الأقل", "Map a phone or email column", locale));
      return;
    }
    setImporting(true); setErr("");
    try {
      const r = await fetch("/api/crm/contacts/import/excel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: mappedRows }),
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

  const colLabel = (i: number) => headers[i] ?? `${tx("عمود", "Column", locale)} ${i + 1}`;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-2xl dark:bg-gray-800 dark:border-gray-700" dir={dir}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 dark:text-white">
            <FileSpreadsheet className="w-5 h-5 text-green-600" />
            {tx("استيراد من Excel", "Import from Excel", locale)}
          </DialogTitle>
          <DialogDescription className="dark:text-gray-400">
            {tx("ارفع الملف وحدد الأعمدة (الرقم أو الإيميل إجباري، والباقي اختياري).", "Upload the file and map columns (phone or email required, rest optional).", locale)}
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
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) parseFile(f); e.target.value = ""; }} />
            <button
              type="button" onClick={() => fileRef.current?.click()} disabled={parsing}
              className="w-full border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-2xl p-6 flex flex-col items-center gap-2 hover:border-[#25D366] transition disabled:opacity-50"
            >
              {parsing ? <Loader2 className="w-6 h-6 animate-spin text-[#25D366]" /> : <Upload className="w-6 h-6 text-gray-400" />}
              <span className="text-sm text-gray-600 dark:text-gray-300">
                {fileName || tx("دوس لاختيار ملف xlsx أو csv", "Click to choose an xlsx or csv file", locale)}
              </span>
            </button>

            {headers.length > 0 && (
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
                        {headers.map((h, i) => <option key={i} value={i}>{h}</option>)}
                      </select>
                    </label>
                  ))}
                </div>
                <div className="rounded-xl border dark:border-gray-700 overflow-auto max-h-44">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>{headers.slice(0, 6).map((h, i) => <th key={i} className="p-2 text-start whitespace-nowrap">{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {rows.slice(0, 5).map((r, i) => (
                        <tr key={i} className="border-t dark:border-gray-700">
                          {headers.slice(0, 6).map((_, j) => <td key={j} className="p-2 whitespace-nowrap text-gray-600 dark:text-gray-300">{r[j] ?? ""}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {tx(`صفوف صالحة (برقم أو إيميل): ${validCount} من ${rows.length}`, `Valid rows (phone or email): ${validCount} of ${rows.length}`, locale)}
                  </span>
                  <Button onClick={doImport} disabled={importing || validCount === 0} className="bg-[#25D366] hover:bg-[#20bb5a] text-white">
                    {importing && <Loader2 className="w-4 h-4 animate-spin" />}
                    {tx(`استيراد ${validCount}`, `Import ${validCount}`, locale)}
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
