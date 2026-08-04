"use client";

import { useMemo, useState } from "react";
import ExcelJS from "exceljs";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/lib/language-context";
import { Loader2, Search, Plus, PenLine, Users, MessageSquareDashed, Crown, TrendingUp } from "lucide-react";
import { AudienceCard } from "@/app/dashboard/contacts/_components/AudienceCard";
import { EngagedCard } from "@/app/dashboard/contacts/_components/EngagedCard";
import { VipCard } from "@/app/dashboard/contacts/_components/VipCard";
import { ExcelUploadDialog } from "@/app/dashboard/contacts/_components/ExcelUploadDialog";
import { CustomAudienceDialog } from "@/app/dashboard/contacts/_components/CustomAudienceDialog";
import { normalizePhone, isValidPhone } from "@/app/dashboard/contacts/_components/phone-utils";
import type { Audience } from "@/app/dashboard/contacts/_components/types";
import { DEMO_CONTACT_AUDIENCES } from "../_lib/demo-data";
import { DemoAudienceDetailModal } from "./_components/DemoAudienceDetailModal";

export default function DemoContactsPage() {
  const { t, dir, locale } = useLanguage();
  const ct = t.contacts;
  const numFmt = (n: number) => n.toLocaleString(locale === "ar" ? "ar-EG" : "en-US");

  const [audiences, setAudiences] = useState<Audience[]>(DEMO_CONTACT_AUDIENCES);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [detailAud, setDetailAud] = useState<Audience | null>(null);

  const [exStep, setExStep] = useState<1 | 2>(1);
  const [parsed, setParsed] = useState<{ phone: string; name: string | null }[]>([]);
  const [invalid, setInvalid] = useState(0);
  const [audName, setAudName] = useState("");
  const [audNotes, setAudNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const [custName, setCustName] = useState("");
  const [custInput, setCustInput] = useState("");
  const [custSaving, setCustSaving] = useState(false);

  const vip = useMemo(() => audiences.find(a => a.type === "vip") ?? null, [audiences]);
  const engaged = useMemo(() => audiences.find(a => a.type === "engaged") ?? null, [audiences]);
  const noResp = useMemo(() => audiences.find(a => a.type === "no-response") ?? null, [audiences]);
  const totalContacts = useMemo(() => audiences.reduce((sum, a) => sum + a.contactCount, 0), [audiences]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return audiences;
    return audiences.filter(a => a.name.toLowerCase().includes(query));
  }, [audiences, search]);

  const customCards = filtered.filter(a => a.type === "custom");
  const excelCards = filtered.filter(a => a.type === "excel");

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
          let phone = "";
          let name: string | null = null;
          if (Array.isArray(row)) {
            row.forEach((cell: any) => {
              const s = String(cell ?? "").trim();
              const norm = normalizePhone(s);
              if (!phone && isValidPhone(norm)) { phone = norm; return; }
              if (!name && s && !/^\d+$/.test(s)) name = s;
            });
          } else {
            for (const key of Object.keys(row)) {
              const s = String(row[key] ?? "").trim();
              const norm = normalizePhone(s);
              if (!phone && isValidPhone(norm)) { phone = norm; }
              else if (!name && s && !/^\d+$/.test(s)) { name = s; }
            }
          }
          if (phone) valid.push({ phone, name });
          else if ((row?.length || Object.keys(row || {}).length) > 0) inv++;
        });

        setParsed(valid);
        setInvalid(inv);
        setExStep(2);
      } catch {
        toast.error(ct.excelDialog.readErr);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const saveExcel = () => {
    if (!audName.trim()) {
      toast.error(ct.excelDialog.nameErr);
      return;
    }
    if (parsed.length === 0) {
      toast.error(ct.excelDialog.noValidErr);
      return;
    }

    setSaving(true);
    const newAudience: Audience = {
      id: `demo-excel-${Date.now()}`,
      name: audName.trim(),
      notes: audNotes.trim() || null,
      type: "excel",
      contacts: parsed.map((item, index) => ({ id: `demo-excel-contact-${Date.now()}-${index}`, phone: item.phone, name: item.name })),
      contactCount: parsed.length,
      createdAt: new Date().toISOString(),
    };

    setAudiences(prev => [newAudience, ...prev]);
    toast.success(ct.excelDialog.saveSuccess(parsed.length));
    setShowAdd(false);
    setExStep(1);
    setParsed([]);
    setInvalid(0);
    setAudName("");
    setAudNotes("");
    setSaving(false);
  };

  const saveCustom = () => {
    if (!custName.trim()) {
      toast.error(ct.customDialog.nameErr);
      return;
    }

    const lines = custInput.split(/[\n,،]+/).map(s => s.trim()).filter(Boolean);
    const valid = lines.map(l => {
      const parts = l.split(/\s+/);
      let phone = "";
      let name: string | null = null;
      for (const p of parts) {
        const n = normalizePhone(p);
        if (!phone && isValidPhone(n)) phone = n;
        else if (!name && p) name = p;
      }
      return phone ? { phone, name } : null;
    }).filter(Boolean) as { phone: string; name: string | null }[];

    if (valid.length === 0) {
      toast.error(ct.customDialog.noValidErr);
      return;
    }

    setCustSaving(true);
    const newAudience: Audience = {
      id: `demo-custom-${Date.now()}`,
      name: custName.trim(),
      notes: null,
      type: "custom",
      contacts: valid.map((item, index) => ({ id: `demo-custom-contact-${Date.now()}-${index}`, phone: item.phone, name: item.name })),
      contactCount: valid.length,
      createdAt: new Date().toISOString(),
    };

    setAudiences(prev => [newAudience, ...prev]);
    toast.success(ct.customDialog.saveSuccess(valid.length));
    setShowCustom(false);
    setCustName("");
    setCustInput("");
    setCustSaving(false);
  };

  const deleteAud = (id: string) => {
    setAudiences(prev => prev.filter(a => a.id !== id));
    if (detailAud?.id === id) setDetailAud(null);
  };

  const updateAudience = (updated: Audience) => {
    setAudiences(prev => prev.map(a => a.id === updated.id ? updated : a));
    setDetailAud(updated);
  };

  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto" dir={dir}>
      <div className="mb-6">
        <p className="text-xs font-semibold text-[#25D366] uppercase tracking-[0.2em] mb-2">{ct.title}</p>
        <h1 className="text-2xl lg:text-3xl font-black text-gray-900 dark:text-white">{ct.title}</h1>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: ct.stats.total, value: totalContacts, icon: <Users className="w-5 h-5 text-blue-500" />, bg: "bg-blue-50 dark:bg-blue-900/20" },
          { label: ct.stats.vip, value: vip?.contactCount ?? 0, icon: <Crown className="w-5 h-5 text-amber-500" />, bg: "bg-amber-50 dark:bg-amber-900/20" },
          { label: ct.stats.engaged, value: engaged?.contactCount ?? 0, icon: <TrendingUp className="w-5 h-5 text-indigo-500" />, bg: "bg-indigo-50 dark:bg-indigo-900/20" },
          { label: ct.stats.noResp, value: noResp?.contactCount ?? 0, icon: <MessageSquareDashed className="w-5 h-5 text-red-400" />, bg: "bg-red-50 dark:bg-red-900/20" },
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

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute right-3 top-2.5 w-4 h-4 text-gray-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder={ct.searchPlaceholder}
            className="pr-9 text-sm dark:bg-gray-800 dark:border-gray-700" />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-1.5 text-sm dark:border-gray-700 dark:text-gray-300"
            onClick={() => setShowCustom(true)}>
            <PenLine className="w-4 h-4" /> {ct.createCustom}
          </Button>
          <Button className="bg-[#25D366] hover:bg-[#1fb956] text-white gap-1.5 text-sm"
            onClick={() => { setExStep(1); setParsed([]); setInvalid(0); setAudName(""); setAudNotes(""); setShowAdd(true); }}>
            <Plus className="w-4 h-4" /> {ct.addContacts}
          </Button>
        </div>
      </div>

      <div className="space-y-8">
        {(vip || engaged || noResp) && (
          <div>
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">{ct.sections.smart}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {vip && <VipCard audience={vip} onView={() => setDetailAud(vip)} />}
              {engaged && <EngagedCard audience={engaged} onView={() => setDetailAud(engaged)} />}
              {noResp && <AudienceCard audience={noResp} onView={() => setDetailAud(noResp)} onEdit={() => setDetailAud(noResp)} onDelete={() => undefined} />}
            </div>
          </div>
        )}

        {customCards.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">{ct.sections.custom}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {customCards.map(a => (
                <AudienceCard key={a.id} audience={a}
                  onView={() => setDetailAud(a)}
                  onEdit={() => setDetailAud(a)}
                  onDelete={() => deleteAud(a.id)} />
              ))}
            </div>
          </div>
        )}

        {excelCards.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">{ct.sections.excel}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {excelCards.map(a => (
                <AudienceCard key={a.id} audience={a}
                  onView={() => setDetailAud(a)}
                  onEdit={() => setDetailAud(a)}
                  onDelete={() => deleteAud(a.id)} />
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

      <ExcelUploadDialog
        open={showAdd}
        onOpenChange={v => { if (!v) { setShowAdd(false); setExStep(1); setParsed([]); setInvalid(0); setAudName(""); setAudNotes(""); } }}
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

      <DemoAudienceDetailModal audience={detailAud} open={!!detailAud} onClose={() => setDetailAud(null)} onSave={updateAudience} />
    </div>
  );
}
