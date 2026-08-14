"use client";

import { useState, useEffect, useCallback } from "react";
import ExcelJS from "exceljs";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Users, Plus, Search, Star, MessageSquareDashed, PenLine, Loader2, TrendingUp, Crown, Sheet, RefreshCw, Unplug,
} from "lucide-react";
import { useLanguage } from "@/lib/language-context";

import type { Audience } from "./_components/types";
import { normalizePhone, isValidPhone } from "./_components/phone-utils";
import { VipCard } from "./_components/VipCard";
import { EngagedCard } from "./_components/EngagedCard";
import { AudienceCard } from "./_components/AudienceCard";
import { AudienceDetailModal } from "./_components/AudienceDetailModal";
import { ExcelUploadDialog } from "./_components/ExcelUploadDialog";
import { CustomAudienceDialog } from "./_components/CustomAudienceDialog";
import { GoogleSheetsImportDialog } from "./_components/GoogleSheetsImportDialog";

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Contacts() {
  const { t, dir, locale } = useLanguage();
  const ct = t.contacts;
  const numFmt = (n: number) => n.toLocaleString(locale === "ar" ? "ar-EG" : "en-US");

  const [audiences,  setAudiences]  = useState<Audience[]>([]);
  const [vip,        setVip]        = useState<Audience | null>(null);
  const [engaged,    setEngaged]    = useState<Audience | null>(null);
  const [noResp,     setNoResp]     = useState<Audience | null>(null);
  const [uniqueCount, setUniqueCount] = useState(0);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState("");
  const [showAdd,    setShowAdd]    = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [detailAud,  setDetailAud]  = useState<Audience | null>(null);
  const [showGoogle, setShowGoogle] = useState(false);
  const [googleConnection, setGoogleConnection] = useState<any>(null);
  const [googleSyncing, setGoogleSyncing] = useState(false);

  // excel flow
  const [exStep,   setExStep]   = useState<1|2>(1);
  const [parsed,   setParsed]   = useState<{ phone:string; name:string|null }[]>([]);
  const [invalid,  setInvalid]  = useState(0);
  const [audName,  setAudName]  = useState("");
  const [audNotes, setAudNotes] = useState("");
  const [saving,   setSaving]   = useState(false);

  // custom flow
  const [custName,   setCustName]   = useState("");
  const [custInput,  setCustInput]  = useState("");
  const [custSaving, setCustSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/audiences");
      const d = await r.json();
      const list: Audience[] = Array.isArray(d) ? d : (d.audiences ?? []);
      setAudiences(list.filter(a => a.type === "excel" || a.type === "custom"));
      setVip(list.find(a => a.type === "vip") ?? null);
      setEngaged(list.find(a => a.type === "engaged") ?? null);
      setNoResp(list.find(a => a.type === "no-response") ?? null);
      setUniqueCount(d.uniqueContactCount ?? 0);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const loadGoogleConnection = useCallback(async () => {
    try {
      const connectionId = new URLSearchParams(window.location.search).get("connectionId");
      const query = connectionId ? `?connectionId=${encodeURIComponent(connectionId)}` : "";
      const r = await fetch(`/api/google-sheets/connection${query}`);
      const data = await r.json();
      setGoogleConnection(data.connection ?? null);
      if (new URLSearchParams(window.location.search).get("googleSheets") === "connected") {
        setShowGoogle(true);
        window.history.replaceState({}, "", window.location.pathname);
      }
      const error = new URLSearchParams(window.location.search).get("googleSheetsError");
      if (error) {
        toast.error(error === "access_denied" ? "تم رفض صلاحية Google Sheets" : "تعذر ربط Google Sheets");
        window.history.replaceState({}, "", window.location.pathname);
      }
    } catch { /* connection is optional */ }
  }, []);

  useEffect(() => { loadGoogleConnection(); }, [loadGoogleConnection]);

  const syncGoogle = async () => {
    if (!googleConnection) return;
    setGoogleSyncing(true);
    try {
      const r = await fetch("/api/google-sheets/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ connectionId: googleConnection.id }) });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      toast.success("تمت مزامنة Google Sheets"); load(); loadGoogleConnection();
    } catch (e: any) { toast.error(e.message); }
    finally { setGoogleSyncing(false); }
  };

  const disconnectGoogle = async () => {
    if (!googleConnection || !window.confirm(locale === "ar" ? "فك ربط Google Sheets؟ لن يتم حذف جهات الاتصال." : "Disconnect Google Sheets? Contacts will not be deleted.")) return;
    const r = await fetch("/api/google-sheets/disconnect", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ connectionId: googleConnection.id }) });
    if (r.ok) { setGoogleConnection(null); toast.success(locale === "ar" ? "تم فك الربط" : "Disconnected"); }
  };

  const setGoogleInterval = async (syncInterval: string) => {
    if (!googleConnection) return;
    await fetch("/api/google-sheets/connection", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ connectionId: googleConnection.id, syncInterval }) });
    loadGoogleConnection();
  };

  const parseFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const buffer = evt.target?.result as ArrayBuffer;
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(buffer);
        const worksheet = workbook.worksheets[0];
        const rows: any[] = [];
        worksheet.eachRow(row => {
          const rowData: any[] = [];
          row.eachCell(cell => rowData.push(cell.value));
          rows.push(rowData);
        });
        const valid: { phone: string; name: string | null }[] = [];
        let inv = 0;
        rows.forEach(row => {
          let phone = ""; let name: string | null = null;
          if (Array.isArray(row)) {
            row.forEach((cell: any) => {
              const s = String(cell ?? "").trim();
              const norm = normalizePhone(s);
              if (!phone && isValidPhone(norm)) { phone = norm; return; }
              if (!name && s && !/^\d+$/.test(s)) name = s;
            });
          } else {
            for (const k of Object.keys(row)) {
              const s = String(row[k] ?? "").trim();
              const norm = normalizePhone(s);
              if (!phone && isValidPhone(norm)) phone = norm;
              else if (!name && s && !/^\d+$/.test(s)) name = s;
            }
          }
          if (phone) valid.push({ phone, name });
          else if (row?.length || Object.keys(row).length) inv++;
        });
        setParsed(valid); setInvalid(inv); setExStep(2);
      } catch { toast.error(ct.excelDialog.readErr); }
    };
    reader.readAsArrayBuffer(file);
  };

  const saveExcel = async () => {
    if (!audName.trim()) { toast.error(ct.excelDialog.nameErr); return; }
    if (parsed.length === 0) { toast.error(ct.excelDialog.noValidErr); return; }
    setSaving(true);
    try {
      const r = await fetch("/api/audiences", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: audName, notes: audNotes, type: "excel", contacts: parsed }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      toast.success(ct.excelDialog.saveSuccess(parsed.length));
      window.dispatchEvent(new Event("trigger-review-prompt"));
      setShowAdd(false); resetExcel(); load();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const saveCustom = async () => {
    if (!custName.trim()) { toast.error(ct.customDialog.nameErr); return; }
    const lines = custInput.split(/[\n,،]+/).map(s => s.trim()).filter(Boolean);
    const valid = lines.map(l => {
      const parts = l.split(/\s+/);
      let phone = ""; let name: string | null = null;
      for (const p of parts) {
        const n = normalizePhone(p);
        if (!phone && isValidPhone(n)) phone = n;
        else if (!name && p) name = p;
      }
      return phone ? { phone, name } : null;
    }).filter(Boolean) as { phone: string; name: string | null }[];
    if (valid.length === 0) { toast.error(ct.customDialog.noValidErr); return; }
    setCustSaving(true);
    try {
      const r = await fetch("/api/audiences", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: custName, notes: null, type: "custom", contacts: valid }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      toast.success(ct.customDialog.saveSuccess(valid.length));
      window.dispatchEvent(new Event("trigger-review-prompt"));
      setShowCustom(false); setCustName(""); setCustInput(""); load();
    } catch (e: any) { toast.error(e.message); }
    finally { setCustSaving(false); }
  };

  const resetExcel = () => {
    setExStep(1); setParsed([]); setInvalid(0); setAudName(""); setAudNotes("");
  };

  const deleteAud = async (id: string) => {
    try {
      const r = await fetch("/api/audiences", {
        method: "DELETE", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!r.ok) throw new Error((await r.json()).error);
      toast.success(ct.deleteSuccess); load();
    } catch (e: any) { toast.error(e.message); }
  };

  const totalContacts = uniqueCount;

  const filtered    = audiences.filter(a => !search || a.name.toLowerCase().includes(search.toLowerCase()));
  const customCards = filtered.filter(a => a.type === "custom");
  const excelCards  = filtered.filter(a => a.type === "excel");

  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto" dir={dir}>
      <div className="mb-6">
        <p className="text-xs font-semibold text-[#25D366] uppercase tracking-[0.2em] mb-2">
          {ct.title}
        </p>
        <h1 className="text-2xl lg:text-3xl font-black text-gray-900 dark:text-white">
          {ct.title}
        </h1>
      </div>

      {/* ── Stats strip ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          {
            label: ct.stats.total,
            value: totalContacts,
            icon: <Users className="w-5 h-5 text-blue-500" />,
            bg: "bg-blue-50 dark:bg-blue-900/20",
          },
          {
            label: ct.stats.vip,
            value: vip?.contactCount ?? 0,
            icon: <Crown className="w-5 h-5 text-amber-500" />,
            bg: "bg-amber-50 dark:bg-amber-900/20",
          },
          {
            label: ct.stats.engaged,
            value: engaged?.contactCount ?? 0,
            icon: <TrendingUp className="w-5 h-5 text-indigo-500" />,
            bg: "bg-indigo-50 dark:bg-indigo-900/20",
          },
          {
            label: ct.stats.noResp,
            value: noResp?.contactCount ?? 0,
            icon: <MessageSquareDashed className="w-5 h-5 text-red-400" />,
            bg: "bg-red-50 dark:bg-red-900/20",
          },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-2xl p-4 flex items-center gap-3`}>
            {s.icon}
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{numFmt(s.value)}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Header bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute right-3 top-2.5 w-4 h-4 text-gray-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)}
            placeholder={ct.searchPlaceholder}
            className="pr-9 text-sm dark:bg-gray-800 dark:border-gray-700" />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-1.5 text-sm border-green-200 text-green-700 dark:border-green-800 dark:text-green-300"
            onClick={() => setShowGoogle(true)}>
            <Sheet className="w-4 h-4" /> {locale === "ar" ? "استيراد من Google Sheets" : "Import from Google Sheets"}
          </Button>
          <Button variant="outline" className="gap-1.5 text-sm dark:border-gray-700 dark:text-gray-300"
            onClick={() => setShowCustom(true)}>
            <PenLine className="w-4 h-4" /> {ct.createCustom}
          </Button>
          <Button className="bg-[#25D366] hover:bg-[#1fb956] text-white gap-1.5 text-sm"
            onClick={() => { resetExcel(); setShowAdd(true); }}>
            <Plus className="w-4 h-4" /> {ct.addContacts}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-gray-300 dark:text-gray-600" />
        </div>
      ) : (
        <div className="space-y-8">

          {googleConnection?.audienceId && (
            <div className="rounded-2xl border border-green-200 dark:border-green-800 bg-green-50/60 dark:bg-green-950/20 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Sheet className="w-6 h-6 text-green-600" />
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">Google Sheets · {googleConnection.spreadsheetName}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{googleConnection.audience?.name} · {numFmt(googleConnection.audience?._count?.contacts ?? 0)} {locale === "ar" ? "عميل" : "contacts"}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{locale === "ar" ? "المزامنة التلقائية:" : "Auto sync:"} <select value={googleConnection.syncInterval ?? "off"} onChange={(e) => setGoogleInterval(e.target.value)} className="bg-transparent font-medium"><option value="off">{locale === "ar" ? "متوقفة" : "Off"}</option><option value="hourly">{locale === "ar" ? "كل ساعة" : "Hourly"}</option><option value="6hours">{locale === "ar" ? "كل 6 ساعات" : "Every 6 hours"}</option><option value="daily">{locale === "ar" ? "يوميًا" : "Daily"}</option></select></p>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" onClick={syncGoogle} disabled={googleSyncing} className="bg-[#25D366] hover:bg-[#1fb956] text-white gap-1"><RefreshCw className={`w-3.5 h-3.5 ${googleSyncing ? "animate-spin" : ""}`} />{locale === "ar" ? "مزامنة الآن" : "Sync now"}</Button>
                <Button size="sm" variant="outline" onClick={() => setShowGoogle(true)}>{locale === "ar" ? "تغيير المصدر" : "Change source"}</Button>
                <Button size="sm" variant="ghost" onClick={disconnectGoogle} className="text-red-500"><Unplug className="w-3.5 h-3.5" /></Button>
              </div>
            </div>
          )}

          {/* ── Smart lists section ── */}
          {(vip || engaged || noResp) && (
            <div>
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
                {ct.sections.smart}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* VIP — premium card */}
                {vip && (
                  <VipCard audience={vip} onView={() => setDetailAud(vip)} />
                )}
                {/* Engaged — blue card */}
                {engaged && (
                  <EngagedCard audience={engaged} onView={() => setDetailAud(engaged)} />
                )}
                {/* No-response — regular card */}
                {noResp && (
                  <AudienceCard audience={noResp}
                    onView={() => setDetailAud(noResp)} onEdit={() => {}} onDelete={() => {}} />
                )}
              </div>
            </div>
          )}

          {customCards.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
                {ct.sections.custom}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {customCards.map(a => (
                  <AudienceCard key={a.id} audience={a}
                    onView={() => setDetailAud(a)} onEdit={() => setDetailAud(a)} onDelete={() => deleteAud(a.id)} />
                ))}
              </div>
            </div>
          )}

          {excelCards.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
                {ct.sections.excel}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {excelCards.map(a => (
                  <AudienceCard key={a.id} audience={a}
                    onView={() => setDetailAud(a)} onEdit={() => setDetailAud(a)} onDelete={() => deleteAud(a.id)} />
                ))}
              </div>
            </div>
          )}

          {customCards.length === 0 && excelCards.length === 0 && !vip && !engaged && !noResp && (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-20 h-20 rounded-3xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-5">
                <Users className="w-10 h-10 text-gray-300 dark:text-gray-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-1">{ct.empty.title}</h3>
              <p className="text-gray-400 dark:text-gray-500 text-sm mb-6 max-w-xs">{ct.empty.subtitle}</p>
              <Button className="bg-[#25D366] hover:bg-[#1fb956] text-white gap-2" onClick={() => setShowAdd(true)}>
                <Plus className="w-4 h-4" /> {ct.empty.btn}
              </Button>
            </div>
          )}
        </div>
      )}

      <ExcelUploadDialog
        open={showAdd}
        onOpenChange={v => { if (!v) { setShowAdd(false); resetExcel(); } }}
        exStep={exStep}
        setExStep={setExStep}
        parsed={parsed}
        invalid={invalid}
        audName={audName}
        setAudName={setAudName}
        audNotes={audNotes}
        setAudNotes={setAudNotes}
        saving={saving}
        onParseFile={parseFile}
        onSave={saveExcel}
      />

      <CustomAudienceDialog
        open={showCustom}
        onOpenChange={v => { if (!v) { setShowCustom(false); setCustName(""); setCustInput(""); } }}
        custName={custName}
        setCustName={setCustName}
        custInput={custInput}
        setCustInput={setCustInput}
        custSaving={custSaving}
        onSave={saveCustom}
      />

      <GoogleSheetsImportDialog
        open={showGoogle}
        onOpenChange={setShowGoogle}
        connection={googleConnection}
        onImported={() => { toast.success(locale === "ar" ? "تم استيراد الجمهور بنجاح" : "Audience imported successfully"); load(); loadGoogleConnection(); }}
      />

      <AudienceDetailModal audience={detailAud} open={!!detailAud} onClose={() => setDetailAud(null)}
        onSave={updated => {
          setAudiences(prev => prev.map(a => a.id === updated.id ? updated : a));
          setDetailAud(null);
        }} />
    </div>
  );
}
