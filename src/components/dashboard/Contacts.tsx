"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Users, Plus, Search, MoreVertical, Eye, Edit2, Trash2,
  Copy, ChevronRight, Star, MessageSquareDashed, Upload,
  FileSpreadsheet, CheckCircle, XCircle, Loader2, X,
  Phone, UserPlus, PenLine,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ContactRow { id: string; phone: string; name: string | null; notes?: string | null }
interface Audience {
  id: string;
  name: string;
  notes: string | null;
  type: "excel" | "custom" | "vip" | "no-response";
  contacts: ContactRow[];
  contactCount: number;
  createdAt: string;
}

// ─── Phone validation ─────────────────────────────────────────────────────────
// accepts Egyptian (start 201…) and international (start with + or country code)
const INTL_RE = /^\d{7,15}$/;   // digits only, 7-15 chars
const EG_RE   = /^20[0-9]{10}$/; // Egyptian format

function normalizePhone(raw: string): string {
  const cleaned = raw.replace(/[\s\-().+]/g, "").replace(/^00/, "");
  if (cleaned.startsWith("0") && cleaned.length === 11)
    return "20" + cleaned.slice(1);
  return cleaned;
}

function isValidPhone(n: string): boolean {
  return EG_RE.test(n) || INTL_RE.test(n);
}

// ─── Drag-and-drop zone ───────────────────────────────────────────────────────
function DropZone({ onFile }: { onFile: (f: File) => void }) {
  const [over, setOver] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  const handle = (files: FileList | null) => {
    const f = files?.[0];
    if (!f) return;
    if (!/\.(xlsx|xls|csv)$/i.test(f.name)) {
      toast.error("فقط ملفات Excel أو CSV"); return;
    }
    onFile(f);
  };

  return (
    <div
      onDragOver={e => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={e => { e.preventDefault(); setOver(false); handle(e.dataTransfer.files); }}
      onClick={() => ref.current?.click()}
      className={`flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-2xl
        p-10 cursor-pointer transition-all select-none
        ${over ? "border-green-400 bg-green-50" : "border-gray-200 hover:border-green-300 hover:bg-gray-50"}`}
    >
      <FileSpreadsheet className={`w-12 h-12 ${over ? "text-green-500" : "text-gray-300"}`} />
      <div className="text-center">
        <p className="font-medium text-gray-700">اسحب الملف هنا أو انقر للاختيار</p>
        <p className="text-xs text-gray-400 mt-1">يدعم .xlsx · .xls · .csv</p>
      </div>
      <input
        ref={ref} type="file" accept=".xlsx,.xls,.csv" className="hidden"
        onChange={e => handle(e.target.files)}
      />
    </div>
  );
}

// ─── Stats strip ──────────────────────────────────────────────────────────────
function PhoneStats({ valid, invalid }: { valid: number; invalid: number }) {
  const total = valid + invalid;
  return (
    <div className="flex gap-4 p-3 bg-gray-50 rounded-xl text-sm">
      <div className="flex items-center gap-1.5 text-green-700">
        <CheckCircle className="w-4 h-4" />
        <span className="font-semibold">{valid}</span> صحيح
      </div>
      <div className="flex items-center gap-1.5 text-red-500">
        <XCircle className="w-4 h-4" />
        <span className="font-semibold">{invalid}</span> خاطئ
      </div>
      <div className="mr-auto text-gray-400 text-xs">
        {total} إجمالي
      </div>
    </div>
  );
}

// ─── Audience Card ────────────────────────────────────────────────────────────
const TYPE_CONFIG = {
  vip:         { bg: "bg-amber-50",  border: "border-amber-200",  icon: <Star className="w-5 h-5 text-amber-500" />,           badge: "VIP",     badgeColor: "bg-amber-100 text-amber-700" },
  "no-response": { bg: "bg-red-50",  border: "border-red-200",    icon: <MessageSquareDashed className="w-5 h-5 text-red-400" />, badge: "لم يردوا", badgeColor: "bg-red-100 text-red-600" },
  custom:      { bg: "bg-purple-50", border: "border-purple-200", icon: <UserPlus className="w-5 h-5 text-purple-500" />,       badge: "مخصص",    badgeColor: "bg-purple-100 text-purple-700" },
  excel:       { bg: "bg-white",     border: "border-gray-200",   icon: <Users className="w-5 h-5 text-gray-500" />,            badge: "",         badgeColor: "" },
};

function AudienceCard({
  audience, onView, onEdit, onDelete,
}: {
  audience: Audience;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const cfg = TYPE_CONFIG[audience.type] ?? TYPE_CONFIG.excel;
  return (
    <div className={`${cfg.bg} ${cfg.border} border rounded-2xl p-4 flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-10 h-10 rounded-xl ${cfg.bg} border ${cfg.border} flex items-center justify-center`}>
            {cfg.icon}
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-sm leading-tight">{audience.name}</p>
            {cfg.badge && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${cfg.badgeColor}`}>
                {cfg.badge}
              </span>
            )}
          </div>
        </div>
        {audience.type !== "vip" && audience.type !== "no-response" && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1.5 rounded-lg hover:bg-black/5 text-gray-400">
                <MoreVertical className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-40">
              <DropdownMenuItem className="gap-2 text-sm cursor-pointer" onClick={onView}>
                <Eye className="w-4 h-4" /> عرض التفاصيل
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2 text-sm cursor-pointer" onClick={onEdit}>
                <Edit2 className="w-4 h-4" /> تعديل الجمهور
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="gap-2 text-sm text-red-600 cursor-pointer focus:text-red-600"
                onClick={onDelete}
              >
                <Trash2 className="w-4 h-4" /> حذف
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        {(audience.type === "vip" || audience.type === "no-response") && (
          <button onClick={onView} className="p-1.5 rounded-lg hover:bg-black/5 text-gray-400">
            <Eye className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* count */}
      <div className="flex items-center gap-1.5 text-2xl font-bold text-gray-800">
        {audience.contactCount.toLocaleString("ar-EG")}
        <span className="text-sm font-normal text-gray-400">جهة اتصال</span>
      </div>

      {/* phone preview */}
      <div className="flex flex-wrap gap-1">
        {audience.contacts.slice(0, 3).map(c => (
          <span key={c.id} className="text-[11px] bg-white/70 border border-gray-200 px-2 py-0.5 rounded-lg text-gray-600 font-mono">
            {c.phone}
          </span>
        ))}
        {audience.contactCount > 3 && (
          <span className="text-[11px] text-gray-400">+{(audience.contactCount - 3).toLocaleString("ar-EG")}</span>
        )}
      </div>

      <button
        onClick={onView}
        className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1 mt-auto"
      >
        عرض التفاصيل <ChevronRight className="w-3 h-3" />
      </button>
    </div>
  );
}

// ─── Details / Edit Modal ─────────────────────────────────────────────────────
function AudienceDetailModal({
  audience, open, onClose, onSave,
}: {
  audience: Audience | null;
  open: boolean;
  onClose: () => void;
  onSave: (a: Audience) => void;
}) {
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [addPhone, setAddPhone] = useState("");
  const [addName,  setAddName]  = useState("");
  const [saving,   setSaving]   = useState(false);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    if (audience) setContacts(audience.contacts);
    setEditMode(false);
    setAddPhone(""); setAddName("");
  }, [audience]);

  if (!audience) return null;

  const addContact = () => {
    const n = normalizePhone(addPhone);
    if (!isValidPhone(n)) { toast.error("رقم غير صالح"); return; }
    if (contacts.find(c => c.phone === n)) { toast.error("الرقم موجود بالفعل"); return; }
    setContacts(prev => [...prev, { id: crypto.randomUUID(), phone: n, name: addName || null }]);
    setAddPhone(""); setAddName("");
  };

  const removeContact = (id: string) => setContacts(prev => prev.filter(c => c.id !== id));

  const copyPhone = (phone: string) => {
    navigator.clipboard.writeText(phone).then(() => toast.success("تم النسخ"));
  };

  const saveChanges = async () => {
    setSaving(true);
    try {
      const r = await fetch("/api/audiences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: audience.id, contacts }),
      });
      if (!r.ok) throw new Error((await r.json()).error);
      toast.success("تم الحفظ");
      onSave({ ...audience, contacts, contactCount: contacts.length });
      setEditMode(false);
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg" dir="rtl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-lg font-bold">{audience.name}</DialogTitle>
              <DialogDescription>{audience.contactCount} جهة اتصال</DialogDescription>
            </div>
            <div className="flex gap-1.5">
              {audience.type !== "vip" && audience.type !== "no-response" && (
                <Button
                  size="sm" variant="outline"
                  onClick={() => setEditMode(p => !p)}
                  className="gap-1.5"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  {editMode ? "إلغاء" : "تعديل"}
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Add contact row — only in edit mode */}
        {editMode && (
          <div className="flex gap-2 bg-gray-50 p-3 rounded-xl">
            <Input
              placeholder="الاسم (اختياري)"
              value={addName}
              onChange={e => setAddName(e.target.value)}
              className="flex-1 text-sm"
            />
            <Input
              dir="ltr"
              placeholder="201234567890"
              value={addPhone}
              onChange={e => setAddPhone(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addContact()}
              className="flex-1 text-sm font-mono"
            />
            <Button size="sm" onClick={addContact} className="bg-green-500 hover:bg-green-600 text-white">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* List */}
        <div className="overflow-y-auto max-h-72 space-y-1.5 pr-1">
          {contacts.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">لا توجد جهات اتصال</p>
          ) : (
            contacts.map(c => (
              <div
                key={c.id}
                className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2.5 group"
              >
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600 flex-shrink-0">
                  {(c.name ?? c.phone).slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  {c.name && <p className="text-sm font-medium text-gray-800 truncate">{c.name}</p>}
                  <p className="text-xs text-gray-500 font-mono">{c.phone}</p>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => copyPhone(c.phone)}
                    className="p-1 text-gray-400 hover:text-gray-600"
                    title="نسخ"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  {editMode && (
                    <button
                      onClick={() => removeContact(c.id)}
                      className="p-1 text-red-400 hover:text-red-600"
                      title="حذف"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {editMode && (
          <div className="flex gap-2 pt-2 border-t border-gray-100">
            <Button variant="outline" className="flex-1" onClick={onClose}>إغلاق</Button>
            <Button
              className="flex-1 bg-green-500 hover:bg-green-600 text-white gap-1.5"
              onClick={saveChanges} disabled={saving}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              حفظ التغييرات
            </Button>
          </div>
        )}
        {!editMode && (
          <Button variant="outline" className="w-full" onClick={onClose}>إغلاق</Button>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Contacts() {
  const [audiences,   setAudiences]   = useState<Audience[]>([]);
  const [vip,         setVip]         = useState<Audience | null>(null);
  const [noResp,      setNoResp]      = useState<Audience | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState("");

  // dialog state
  const [showAdd,     setShowAdd]     = useState(false); // excel flow
  const [showCustom,  setShowCustom]  = useState(false); // custom flow
  const [detailAud,   setDetailAud]   = useState<Audience | null>(null);

  // excel flow state
  const [exStep,      setExStep]      = useState<1|2>(1);
  const [parsed,      setParsed]      = useState<{ phone:string; name:string|null }[]>([]);
  const [invalid,     setInvalid]     = useState(0);
  const [audName,     setAudName]     = useState("");
  const [audNotes,    setAudNotes]    = useState("");
  const [saving,      setSaving]      = useState(false);

  // custom flow state
  const [custName,    setCustName]    = useState("");
  const [custInput,   setCustInput]   = useState(""); // phone per line
  const [custSaving,  setCustSaving]  = useState(false);

  // ── Fetch ──────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/audiences");
      const d = await r.json();
      const list: Audience[] = Array.isArray(d) ? d : d.data ?? [];
      setAudiences(list.filter(a => a.type === "excel" || a.type === "custom"));
      setVip(list.find(a => a.type === "vip") ?? null);
      setNoResp(list.find(a => a.type === "no-response") ?? null);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Parse Excel/CSV ────────────────────────────────────────────
  const parseFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = evt => {
      const wb = XLSX.read(evt.target?.result, { type: "binary" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<any>(ws, { header: 1, raw: false });

      const valid: { phone: string; name: string | null }[] = [];
      let inv = 0;

      rows.forEach(row => {
        // try to find phone in any cell; also look for name column
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
          // object row — look for phone-like keys
          const keys = Object.keys(row);
          for (const k of keys) {
            const s = String(row[k] ?? "").trim();
            const norm = normalizePhone(s);
            if (!phone && isValidPhone(norm)) phone = norm;
            else if (!name && s && !/^\d+$/.test(s)) name = s;
          }
        }

        if (phone) { valid.push({ phone, name }); }
        else if (row.length || Object.keys(row).length) inv++;
      });

      setParsed(valid);
      setInvalid(inv);
      setExStep(2);
    };
    reader.readAsBinaryString(file);
  };

  // ── Save excel audience ─────────────────────────────────────────
  const saveExcel = async () => {
    if (!audName.trim()) { toast.error("أدخل اسم الجمهور"); return; }
    if (parsed.length === 0) { toast.error("لا توجد أرقام صالحة"); return; }
    setSaving(true);
    try {
      const r = await fetch("/api/audiences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: audName, notes: audNotes, type: "excel",
          contacts: parsed.map(p => ({ phone: p.phone, name: p.name })),
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      toast.success(`تم حفظ ${parsed.length} جهة اتصال`);
      setShowAdd(false);
      resetExcel();
      load();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  // ── Save custom audience ────────────────────────────────────────
  const saveCustom = async () => {
    if (!custName.trim()) { toast.error("أدخل اسم الجمهور"); return; }
    const lines = custInput.split(/[\n,،]+/).map(s => s.trim()).filter(Boolean);
    const valid = lines.map(l => {
      // try to split "name phone" or "phone name"
      const parts = l.split(/\s+/);
      let phone = ""; let name: string | null = null;
      for (const p of parts) {
        const n = normalizePhone(p);
        if (!phone && isValidPhone(n)) { phone = n; }
        else if (!name && p) name = p;
      }
      return phone ? { phone, name } : null;
    }).filter(Boolean) as { phone: string; name: string | null }[];

    if (valid.length === 0) { toast.error("لا توجد أرقام صالحة"); return; }
    setCustSaving(true);
    try {
      const r = await fetch("/api/audiences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: custName, notes: null, type: "custom",
          contacts: valid,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      toast.success(`تم حفظ ${valid.length} جهة اتصال`);
      setShowCustom(false);
      setCustName(""); setCustInput("");
      load();
    } catch (e: any) { toast.error(e.message); }
    finally { setCustSaving(false); }
  };

  const resetExcel = () => {
    setExStep(1); setParsed([]); setInvalid(0);
    setAudName(""); setAudNotes("");
  };

  const deleteAud = async (id: string) => {
    try {
      const r = await fetch("/api/audiences", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!r.ok) throw new Error((await r.json()).error);
      toast.success("تم الحذف");
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  // ── Derived ─────────────────────────────────────────────────────
  const totalContacts = audiences.reduce((s, a) => s + a.contactCount, 0)
    + (vip?.contactCount ?? 0) + (noResp?.contactCount ?? 0);

  const filtered = audiences.filter(a =>
    !search || a.name.toLowerCase().includes(search.toLowerCase())
  );

  const customCards = filtered.filter(a => a.type === "custom");
  const excelCards  = filtered.filter(a => a.type === "excel");

  // ─────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto" dir="rtl">

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: "إجمالي جهات الاتصال", value: totalContacts,                    icon: <Users className="w-5 h-5 text-blue-500" />,  bg: "bg-blue-50" },
          { label: "العملاء المميزين VIP",  value: vip?.contactCount ?? 0,          icon: <Star className="w-5 h-5 text-amber-500" />,   bg: "bg-amber-50" },
          { label: "لم يردوا",              value: noResp?.contactCount ?? 0,       icon: <MessageSquareDashed className="w-5 h-5 text-red-400" />, bg: "bg-red-50" },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-2xl p-4 flex items-center gap-3`}>
            {s.icon}
            <div>
              <p className="text-2xl font-bold text-gray-900">{s.value.toLocaleString("ar-EG")}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute right-3 top-2.5 w-4 h-4 text-gray-400" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="البحث باسم الجمهور..."
            className="pr-9 text-sm"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="gap-1.5 text-sm"
            onClick={() => setShowCustom(true)}
          >
            <PenLine className="w-4 h-4" /> إنشاء جمهور مخصص
          </Button>
          <Button
            className="bg-green-500 hover:bg-green-600 text-white gap-1.5 text-sm"
            onClick={() => { resetExcel(); setShowAdd(true); }}
          >
            <Plus className="w-4 h-4" /> إضافة جهات اتصال
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-gray-300" />
        </div>
      ) : (
        <div className="space-y-8">

          {/* Featured / smart cards */}
          {(vip || noResp) && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">قوائم ذكية</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {vip && (
                  <AudienceCard
                    audience={vip}
                    onView={() => setDetailAud(vip)}
                    onEdit={() => {}}
                    onDelete={() => {}}
                  />
                )}
                {noResp && (
                  <AudienceCard
                    audience={noResp}
                    onView={() => setDetailAud(noResp)}
                    onEdit={() => {}}
                    onDelete={() => {}}
                  />
                )}
              </div>
            </div>
          )}

          {/* Custom audiences */}
          {customCards.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">جمهور مخصص</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {customCards.map(a => (
                  <AudienceCard
                    key={a.id} audience={a}
                    onView={() => setDetailAud(a)}
                    onEdit={() => setDetailAud(a)}
                    onDelete={() => deleteAud(a.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Regular audiences */}
          {excelCards.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">جهات الاتصال</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {excelCards.map(a => (
                  <AudienceCard
                    key={a.id} audience={a}
                    onView={() => setDetailAud(a)}
                    onEdit={() => setDetailAud(a)}
                    onDelete={() => deleteAud(a.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Empty */}
          {customCards.length === 0 && excelCards.length === 0 && !vip && !noResp && (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-20 h-20 rounded-3xl bg-gray-100 flex items-center justify-center mb-5">
                <Users className="w-10 h-10 text-gray-300" />
              </div>
              <h3 className="text-lg font-semibold text-gray-700 mb-1">لا توجد جهات اتصال بعد</h3>
              <p className="text-gray-400 text-sm mb-6 max-w-xs">أضف جمهورك الأول عبر رفع ملف Excel أو إنشاء جمهور مخصص</p>
              <Button className="bg-green-500 hover:bg-green-600 text-white gap-2" onClick={() => setShowAdd(true)}>
                <Plus className="w-4 h-4" /> إضافة جهات اتصال
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ═══ Excel Upload Dialog ═══ */}
      <Dialog open={showAdd} onOpenChange={v => { if (!v) { setShowAdd(false); resetExcel(); } }}>
        <DialogContent className="max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">إضافة جهات اتصال</DialogTitle>
            <DialogDescription>
              {exStep === 1 ? "ارفع ملف Excel أو CSV لاستخراج الأرقام" : "تأكيد البيانات وحفظ الجمهور"}
            </DialogDescription>
          </DialogHeader>

          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-2">
            {[1, 2].map(s => (
              <div key={s} className="flex items-center gap-1.5">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  exStep >= s ? "bg-green-500 text-white" : "bg-gray-100 text-gray-400"}`}>
                  {exStep > s ? <CheckCircle className="w-4 h-4" /> : s}
                </div>
                <span className={`text-xs ${exStep === s ? "text-green-600 font-medium" : "text-gray-400"}`}>
                  {s === 1 ? "رفع الملف" : "تأكيد الحفظ"}
                </span>
                {s < 2 && <div className={`h-0.5 w-8 ${exStep > s ? "bg-green-400" : "bg-gray-200"}`} />}
              </div>
            ))}
          </div>

          {exStep === 1 && (
            <div className="space-y-4">
              <DropZone onFile={parseFile} />
              <p className="text-xs text-gray-400 text-center">
                يقبل الأرقام المصرية (20×××) والدولية بالصيغة الدولية
              </p>
            </div>
          )}

          {exStep === 2 && (
            <div className="space-y-4">
              <PhoneStats valid={parsed.length} invalid={invalid} />

              <div>
                <Label className="text-sm mb-1 block">اسم الجمهور *</Label>
                <Input
                  value={audName}
                  onChange={e => setAudName(e.target.value)}
                  placeholder="مثال: عملاء رمضان 2025"
                />
              </div>

              <div>
                <Label className="text-sm mb-1 block">ملاحظة (اختياري)</Label>
                <Textarea
                  value={audNotes}
                  onChange={e => setAudNotes(e.target.value)}
                  placeholder="أي ملاحظة عن هذا الجمهور..."
                  className="min-h-[70px] resize-none text-sm"
                />
              </div>

              {/* preview */}
              <div className="bg-gray-50 rounded-xl p-3 max-h-36 overflow-y-auto space-y-1">
                {parsed.slice(0, 10).map((p, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span className="font-mono text-gray-600">{p.phone}</span>
                    {p.name && <span className="text-gray-400">— {p.name}</span>}
                  </div>
                ))}
                {parsed.length > 10 && (
                  <p className="text-xs text-gray-400">+{parsed.length - 10} أخرى</p>
                )}
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setExStep(1)}>السابق</Button>
                <Button
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white gap-1.5"
                  onClick={saveExcel}
                  disabled={saving || !audName.trim() || parsed.length === 0}
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  حفظ الجمهور
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ═══ Custom Audience Dialog ═══ */}
      <Dialog open={showCustom} onOpenChange={v => { if (!v) { setShowCustom(false); setCustName(""); setCustInput(""); } }}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">إنشاء جمهور مخصص</DialogTitle>
            <DialogDescription>أدخل الأرقام يدوياً أو بالنسخ واللصق</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="text-sm mb-1 block">اسم الجمهور *</Label>
              <Input
                value={custName}
                onChange={e => setCustName(e.target.value)}
                placeholder="مثال: VIP خاص"
              />
            </div>

            <div>
              <Label className="text-sm mb-1 block">الأرقام (رقم في كل سطر)</Label>
              <Textarea
                dir="ltr"
                value={custInput}
                onChange={e => setCustInput(e.target.value)}
                placeholder={"201234567890 أحمد\n447911123456\n9715551234"}
                className="font-mono text-sm min-h-[140px] resize-none"
              />
              <p className="text-xs text-gray-400 mt-1">
                يمكنك كتابة الاسم ورقم الهاتف في نفس السطر — يُقبل النسخ واللصق
              </p>
            </div>

            {/* live count */}
            {custInput.trim() && (() => {
              const lines = custInput.split(/[\n,،]+/).map(s => s.trim()).filter(Boolean);
              const v = lines.filter(l => {
                const parts = l.split(/\s+/);
                return parts.some(p => isValidPhone(normalizePhone(p)));
              }).length;
              return <PhoneStats valid={v} invalid={lines.length - v} />;
            })()}

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowCustom(false)}>إلغاء</Button>
              <Button
                className="flex-1 bg-green-500 hover:bg-green-600 text-white gap-1.5"
                onClick={saveCustom}
                disabled={custSaving || !custName.trim() || !custInput.trim()}
              >
                {custSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                حفظ الجمهور
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══ Detail / Edit Modal ═══ */}
      <AudienceDetailModal
        audience={detailAud}
        open={!!detailAud}
        onClose={() => setDetailAud(null)}
        onSave={updated => {
          setAudiences(prev => prev.map(a => a.id === updated.id ? updated : a));
          setDetailAud(null);
        }}
      />
    </div>
  );
}