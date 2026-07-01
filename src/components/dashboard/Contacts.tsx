"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import ExcelJS from "exceljs";
import { toast } from "sonner";
import { Button }   from "@/components/ui/button";
import { Input }    from "@/components/ui/input";
import { Label }    from "@/components/ui/label";
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
  Phone, UserPlus, PenLine, Sparkles, TrendingUp, ShoppingBag,
  MessageCircle, Crown, Info,
} from "lucide-react";
import { useLanguage } from "@/lib/language-context";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ContactRow { id: string; phone: string; name: string | null; notes?: string | null }
interface Audience {
  id: string;
  name: string;
  notes: string | null;
  type: "excel" | "custom" | "vip" | "engaged" | "no-response";
  contacts: ContactRow[];
  contactCount: number;
  createdAt: string;
}

// ─── Phone validation ─────────────────────────────────────────────────────────
const INTL_RE = /^\d{7,15}$/;
const EG_RE   = /^20[0-9]{10}$/;

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
  const { t } = useLanguage();
  const dz = t.contacts.dropzone;
  const [over, setOver] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  const handle = (files: FileList | null) => {
    const f = files?.[0];
    if (!f) return;
    if (!/\.(xlsx|xls|csv)$/i.test(f.name)) { toast.error(dz.typeErr); return; }
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
        ${over
          ? "border-green-400 bg-green-50 dark:bg-green-900/20"
          : "border-gray-200 dark:border-gray-600 hover:border-green-300 hover:bg-gray-50 dark:hover:bg-gray-700/40"}`}
    >
      <FileSpreadsheet className={`w-12 h-12 ${over ? "text-green-500" : "text-gray-300 dark:text-gray-500"}`} />
      <div className="text-center">
        <p className="font-medium text-gray-700 dark:text-gray-300">{dz.drag}</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{dz.formats}</p>
      </div>
      <input ref={ref} type="file" accept=".xlsx,.xls,.csv" className="hidden"
        onChange={e => handle(e.target.files)} />
    </div>
  );
}

// ─── Stats strip ──────────────────────────────────────────────────────────────
function PhoneStats({ valid, invalid }: { valid: number; invalid: number }) {
  const { t } = useLanguage();
  const ps = t.contacts.phoneStats;
  const total = valid + invalid;
  return (
    <div className="flex gap-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl text-sm">
      <div className="flex items-center gap-1.5 text-green-700 dark:text-green-400">
        <CheckCircle className="w-4 h-4" />
        <span className="font-semibold">{valid}</span> {ps.valid}
      </div>
      <div className="flex items-center gap-1.5 text-red-500 dark:text-red-400">
        <XCircle className="w-4 h-4" />
        <span className="font-semibold">{invalid}</span> {ps.invalid}
      </div>
      <div className="mr-auto text-gray-400 dark:text-gray-500 text-xs">{total} {ps.total}</div>
    </div>
  );
}

// ─── VIP Card — premium design ────────────────────────────────────────────────
function VipCard({ audience, onView }: { audience: Audience; onView: () => void }) {
  const { t, locale } = useLanguage();
  const c    = t.contacts.card;
  const vc   = t.contacts.vipCriteria;
  const numFmt = (n: number) => n.toLocaleString(locale === "ar" ? "ar-EG" : "en-US");

  return (
    <div className="relative overflow-hidden rounded-2xl border border-amber-200 dark:border-amber-800
      bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50
      dark:from-amber-950/40 dark:via-yellow-950/30 dark:to-orange-950/40
      shadow-md hover:shadow-xl transition-all duration-300 group">

      {/* Shimmer strip */}
      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-400 via-yellow-300 to-orange-400 rounded-t-2xl" />

      {/* Subtle background crown */}
      <div className="absolute -top-3 -left-3 opacity-5 dark:opacity-10 pointer-events-none">
        <Crown className="w-28 h-28 text-amber-500" />
      </div>

      <div className="p-4 flex flex-col gap-3 relative">

        {/* Header row */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-400 to-orange-400 shadow-sm
              flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
              <Crown className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <p className="font-bold text-gray-900 dark:text-white text-sm leading-tight">
                {audience.name}
              </p>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full
                bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 mt-0.5">
                <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                VIP
              </span>
            </div>
          </div>
          <button onClick={onView}
            className="p-1.5 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/30 text-amber-500 transition-colors">
            <Eye className="w-4 h-4" />
          </button>
        </div>

        {/* Count */}
        <div className="flex items-baseline gap-1.5">
          <span className="text-3xl font-black text-amber-600 dark:text-amber-400 leading-none">
            {numFmt(audience.contactCount)}
          </span>
          <span className="text-sm font-normal text-amber-500/70 dark:text-amber-400/60">{c.contact}</span>
        </div>

        {/* Phone pills */}
        <div className="flex flex-wrap gap-1">
          {audience.contacts.slice(0, 3).map(ct => (
            <span key={ct.id}
              className="text-[11px] bg-amber-100/80 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700
              px-2 py-0.5 rounded-lg text-amber-700 dark:text-amber-300 font-mono">
              {ct.phone}
            </span>
          ))}
          {audience.contactCount > 3 && (
            <span className="text-[11px] text-amber-500/70">+{numFmt(audience.contactCount - 3)}</span>
          )}
        </div>

        {/* Criteria tooltip strip */}
        <div className="flex items-start gap-2 bg-amber-100/60 dark:bg-amber-900/20 rounded-xl px-3 py-2 mt-1">
          <Info className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="text-[11px] text-amber-700 dark:text-amber-300 space-y-0.5">
            <p className="font-semibold">{vc.badge}</p>
            <p className="flex items-center gap-1">
              <MessageCircle className="w-3 h-3" /> {vc.rule1}
            </p>
            <p className="flex items-center gap-1">
              <ShoppingBag className="w-3 h-3" /> {vc.rule2}
            </p>
          </div>
        </div>

        {/* View link */}
        <button onClick={onView}
          className="text-xs text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200
          flex items-center gap-1 mt-auto font-medium transition-colors">
          {c.viewDetails} <ChevronRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

// ─── Engaged Card ─────────────────────────────────────────────────────────────
function EngagedCard({ audience, onView }: { audience: Audience; onView: () => void }) {
  const { t, locale } = useLanguage();
  const c = t.contacts.card;
  const numFmt = (n: number) => n.toLocaleString(locale === "ar" ? "ar-EG" : "en-US");

  return (
    <div className="relative rounded-2xl border border-blue-200 dark:border-blue-800
      bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/20
      shadow-sm hover:shadow-md transition-all duration-200 group">

      <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-blue-400 to-indigo-400 rounded-t-2xl" />

      <div className="p-4 flex flex-col gap-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center
              group-hover:scale-105 transition-transform duration-200 shadow-sm">
              <TrendingUp className="w-5 h-5 text-white" strokeWidth={2} />
            </div>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white text-sm leading-tight">
                {audience.name}
              </p>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md
                bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                {t.contacts.types.engaged}
              </span>
            </div>
          </div>
          <button onClick={onView}
            className="p-1.5 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 text-gray-400 transition-colors">
            <Eye className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-bold text-blue-600 dark:text-blue-400 leading-none">
            {numFmt(audience.contactCount)}
          </span>
          <span className="text-sm font-normal text-gray-400">{c.contact}</span>
        </div>

        <div className="flex flex-wrap gap-1">
          {audience.contacts.slice(0, 3).map(ct => (
            <span key={ct.id}
              className="text-[11px] bg-white/70 dark:bg-gray-700/70 border border-blue-200 dark:border-blue-700
              px-2 py-0.5 rounded-lg text-gray-600 dark:text-gray-400 font-mono">
              {ct.phone}
            </span>
          ))}
          {audience.contactCount > 3 && (
            <span className="text-[11px] text-gray-400">+{numFmt(audience.contactCount - 3)}</span>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-blue-600/70 dark:text-blue-400/70">
          <MessageCircle className="w-3 h-3" />
          <span>ردّوا على رسائلك ولو مرة</span>
        </div>

        <button onClick={onView}
          className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200
          flex items-center gap-1 mt-auto transition-colors">
          {c.viewDetails} <ChevronRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

// ─── Regular Audience Card ────────────────────────────────────────────────────
function getTypeConfig(t: ReturnType<typeof useLanguage>["t"]) {
  const types = t.contacts.types;
  return {
    "no-response": {
      bg: "bg-red-50 dark:bg-red-900/20", border: "border-red-200 dark:border-red-800",
      icon: <MessageSquareDashed className="w-5 h-5 text-red-400" />,
      badge: types.noResponse, badgeColor: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
    },
    custom: {
      bg: "bg-purple-50 dark:bg-purple-900/20", border: "border-purple-200 dark:border-purple-800",
      icon: <UserPlus className="w-5 h-5 text-purple-500" />,
      badge: types.custom, badgeColor: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
    },
    excel: {
      bg: "bg-white dark:bg-gray-800", border: "border-gray-200 dark:border-gray-700",
      icon: <Users className="w-5 h-5 text-gray-500 dark:text-gray-400" />,
      badge: "", badgeColor: "",
    },
  };
}

function AudienceCard({ audience, onView, onEdit, onDelete }: {
  audience: Audience; onView: () => void; onEdit: () => void; onDelete: () => void;
}) {
  const { t, locale } = useLanguage();
  const c = t.contacts.card;
  const cfg = getTypeConfig(t)[audience.type as "no-response" | "custom" | "excel"] ?? getTypeConfig(t).excel;
  const numFmt = (n: number) => n.toLocaleString(locale === "ar" ? "ar-EG" : "en-US");

  return (
    <div className={`${cfg.bg} ${cfg.border} border rounded-2xl p-4 flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-10 h-10 rounded-xl ${cfg.bg} border ${cfg.border} flex items-center justify-center`}>
            {cfg.icon}
          </div>
          <div>
            <p className="font-semibold text-gray-900 dark:text-white text-sm leading-tight">{audience.name}</p>
            {cfg.badge && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${cfg.badgeColor}`}>{cfg.badge}</span>
            )}
          </div>
        </div>

        {audience.type !== "no-response" ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-gray-400">
                <MoreVertical className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              <DropdownMenuItem className="gap-2 text-sm cursor-pointer" onClick={onView}>
                <Eye className="w-4 h-4" /> {c.viewDetails}
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2 text-sm cursor-pointer" onClick={onEdit}>
                <Edit2 className="w-4 h-4" /> {c.edit}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="gap-2 text-sm text-red-600 cursor-pointer focus:text-red-600" onClick={onDelete}>
                <Trash2 className="w-4 h-4" /> {c.delete}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <button onClick={onView} className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-gray-400">
            <Eye className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex items-center gap-1.5 text-2xl font-bold text-gray-800 dark:text-white">
        {numFmt(audience.contactCount)}
        <span className="text-sm font-normal text-gray-400 dark:text-gray-500">{c.contact}</span>
      </div>

      <div className="flex flex-wrap gap-1">
        {audience.contacts.slice(0, 3).map(ct => (
          <span key={ct.id}
            className="text-[11px] bg-white/70 dark:bg-gray-700/70 border border-gray-200 dark:border-gray-600
            px-2 py-0.5 rounded-lg text-gray-600 dark:text-gray-400 font-mono">
            {ct.phone}
          </span>
        ))}
        {audience.contactCount > 3 && (
          <span className="text-[11px] text-gray-400 dark:text-gray-500">
            +{numFmt(audience.contactCount - 3)}
          </span>
        )}
      </div>

      <button onClick={onView}
        className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200
        flex items-center gap-1 mt-auto">
        {c.viewDetails} <ChevronRight className="w-3 h-3" />
      </button>
    </div>
  );
}

// ─── Details / Edit Modal ─────────────────────────────────────────────────────
function AudienceDetailModal({ audience, open, onClose, onSave }: {
  audience: Audience | null; open: boolean; onClose: () => void; onSave: (a: Audience) => void;
}) {
  const { t, dir } = useLanguage();
  const dm = t.contacts.detailModal;

  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [addPhone, setAddPhone] = useState("");
  const [addName,  setAddName]  = useState("");
  const [saving,   setSaving]   = useState(false);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    if (audience) setContacts(audience.contacts);
    setEditMode(false); setAddPhone(""); setAddName("");
  }, [audience]);

  if (!audience) return null;

  const isReadOnly = audience.type === "vip" || audience.type === "engaged" || audience.type === "no-response";

  const addContact = () => {
    const n = normalizePhone(addPhone);
    if (!isValidPhone(n)) { toast.error(dm.invalidPhone); return; }
    if (contacts.find(c => c.phone === n)) { toast.error(dm.duplicate); return; }
    setContacts(prev => [...prev, { id: crypto.randomUUID(), phone: n, name: addName || null }]);
    setAddPhone(""); setAddName("");
  };

  const removeContact = (id: string) => setContacts(prev => prev.filter(c => c.id !== id));

  const copyPhone = (phone: string) => {
    navigator.clipboard.writeText(phone).then(() => toast.success(dm.copied));
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
      toast.success(dm.saved);
      window.dispatchEvent(new Event("trigger-review-prompt"));
      onSave({ ...audience, contacts, contactCount: contacts.length });
      setEditMode(false);
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg dark:bg-gray-800 dark:border-gray-700" dir={dir}>
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-lg font-bold dark:text-white">{audience.name}</DialogTitle>
              <DialogDescription className="dark:text-gray-400">{dm.contactCount(audience.contactCount)}</DialogDescription>
            </div>
            {!isReadOnly && (
              <Button size="sm" variant="outline" onClick={() => setEditMode(p => !p)}
                className="gap-1.5 dark:border-gray-600 dark:text-gray-300">
                <Edit2 className="w-3.5 h-3.5" />
                {editMode ? dm.cancel : dm.edit}
              </Button>
            )}
          </div>
        </DialogHeader>

        {editMode && (
          <div className="flex gap-2 bg-gray-50 dark:bg-gray-700/50 p-3 rounded-xl">
            <Input placeholder={dm.namePlaceholder} value={addName} onChange={e => setAddName(e.target.value)}
              className="flex-1 text-sm dark:bg-gray-700 dark:border-gray-600" />
            <Input dir="ltr" placeholder={dm.phonePlaceholder} value={addPhone}
              onChange={e => setAddPhone(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addContact()}
              className="flex-1 text-sm font-mono dark:bg-gray-700 dark:border-gray-600" />
            <Button size="sm" onClick={addContact} className="bg-green-500 hover:bg-green-600 text-white">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        )}

        <div className="overflow-y-auto max-h-72 space-y-1.5 pr-1">
          {contacts.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">{dm.noContacts}</p>
          ) : contacts.map(c => (
            <div key={c.id}
              className="flex items-center gap-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl px-3 py-2.5 group">
              <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center
                text-xs font-bold text-gray-600 dark:text-gray-300 flex-shrink-0">
                {(c.name ?? c.phone).slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                {c.name && <p className="text-sm font-medium text-gray-800 dark:text-white truncate">{c.name}</p>}
                <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">{c.phone}</p>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => copyPhone(c.phone)} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                  <Copy className="w-3.5 h-3.5" />
                </button>
                {editMode && (
                  <button onClick={() => removeContact(c.id)} className="p-1 text-red-400 hover:text-red-600">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {editMode ? (
          <div className="flex gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
            <Button variant="outline" className="flex-1 dark:border-gray-600 dark:text-gray-300"
              onClick={onClose}>{dm.closeBtn}</Button>
            <Button className="flex-1 bg-green-500 hover:bg-green-600 text-white gap-1.5"
              onClick={saveChanges} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {dm.saveBtn}
            </Button>
          </div>
        ) : (
          <Button variant="outline" className="w-full dark:border-gray-600 dark:text-gray-300"
            onClick={onClose}>{dm.closeBtn}</Button>
        )}
      </DialogContent>
    </Dialog>
  );
}

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

      {/* ═══ Excel Upload Dialog ═══ */}
      <Dialog open={showAdd} onOpenChange={v => { if (!v) { setShowAdd(false); resetExcel(); } }}>
        <DialogContent className="max-w-lg dark:bg-gray-800 dark:border-gray-700" dir={dir}>
          <DialogHeader>
            <DialogTitle className="text-lg font-bold dark:text-white">{ct.excelDialog.title}</DialogTitle>
            <DialogDescription className="dark:text-gray-400">
              {exStep === 1 ? ct.excelDialog.step1Desc : ct.excelDialog.step2Desc}
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-2 mb-2">
            {[1, 2].map(s => (
              <div key={s} className="flex items-center gap-1.5">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  exStep >= s ? "bg-green-500 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-400"}`}>
                  {exStep > s ? <CheckCircle className="w-4 h-4" /> : s}
                </div>
                <span className={`text-xs ${exStep === s ? "text-green-600 font-medium" : "text-gray-400 dark:text-gray-500"}`}>
                  {s === 1 ? ct.excelDialog.step1Label : ct.excelDialog.step2Label}
                </span>
                {s < 2 && <div className={`h-0.5 w-8 ${exStep > s ? "bg-green-400" : "bg-gray-200 dark:bg-gray-700"}`} />}
              </div>
            ))}
          </div>

          {exStep === 1 && (
            <div className="space-y-4">
              <DropZone onFile={parseFile} />
              <p className="text-xs text-gray-400 dark:text-gray-500 text-center">{ct.excelDialog.hint}</p>
            </div>
          )}

          {exStep === 2 && (
            <div className="space-y-4">
              <PhoneStats valid={parsed.length} invalid={invalid} />
              <div>
                <Label className="text-sm mb-1 block dark:text-gray-300">{ct.excelDialog.nameLabel} *</Label>
                <Input value={audName} onChange={e => setAudName(e.target.value)}
                  placeholder={ct.excelDialog.namePlaceholder}
                  className="dark:bg-gray-700 dark:border-gray-600" />
              </div>
              <div>
                <Label className="text-sm mb-1 block dark:text-gray-300">{ct.excelDialog.notesLabel}</Label>
                <Textarea value={audNotes} onChange={e => setAudNotes(e.target.value)}
                  placeholder={ct.excelDialog.notesPlaceholder}
                  className="min-h-[70px] resize-none text-sm dark:bg-gray-700 dark:border-gray-600" />
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3 max-h-36 overflow-y-auto space-y-1">
                {parsed.slice(0, 10).map((p, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span className="font-mono text-gray-600 dark:text-gray-400">{p.phone}</span>
                    {p.name && <span className="text-gray-400 dark:text-gray-500">— {p.name}</span>}
                  </div>
                ))}
                {parsed.length > 10 && <p className="text-xs text-gray-400">{ct.excelDialog.moreItems(parsed.length - 10)}</p>}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 dark:border-gray-600 dark:text-gray-300"
                  onClick={() => setExStep(1)}>{ct.excelDialog.prevBtn}</Button>
                <Button className="flex-1 bg-[#25D366] hover:bg-[#1fb956] text-white gap-1.5"
                  onClick={saveExcel} disabled={saving || !audName.trim() || parsed.length === 0}>
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {ct.excelDialog.saveBtn}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ═══ Custom Audience Dialog ═══ */}
      <Dialog open={showCustom} onOpenChange={v => { if (!v) { setShowCustom(false); setCustName(""); setCustInput(""); } }}>
        <DialogContent className="max-w-md dark:bg-gray-800 dark:border-gray-700" dir={dir}>
          <DialogHeader>
            <DialogTitle className="text-lg font-bold dark:text-white">{ct.customDialog.title}</DialogTitle>
            <DialogDescription className="dark:text-gray-400">{ct.customDialog.desc}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm mb-1 block dark:text-gray-300">{ct.customDialog.nameLabel} *</Label>
              <Input value={custName} onChange={e => setCustName(e.target.value)}
                placeholder={ct.customDialog.namePlaceholder}
                className="dark:bg-gray-700 dark:border-gray-600" />
            </div>
            <div>
              <Label className="text-sm mb-1 block dark:text-gray-300">{ct.customDialog.phonesLabel}</Label>
              <Textarea dir="ltr" value={custInput} onChange={e => setCustInput(e.target.value)}
                placeholder={"201234567890 Ahmed\n447911123456\n9715551234"}
                className="font-mono text-sm min-h-[140px] resize-none dark:bg-gray-700 dark:border-gray-600" />
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{ct.customDialog.hint}</p>
            </div>
            {custInput.trim() && (() => {
              const lines = custInput.split(/[\n,،]+/).map(s => s.trim()).filter(Boolean);
              const v = lines.filter(l => l.split(/\s+/).some(p => isValidPhone(normalizePhone(p)))).length;
              return <PhoneStats valid={v} invalid={lines.length - v} />;
            })()}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 dark:border-gray-600 dark:text-gray-300"
                onClick={() => setShowCustom(false)}>{ct.customDialog.cancelBtn}</Button>
              <Button className="flex-1 bg-[#25D366] hover:bg-[#1fb956] text-white gap-1.5"
                onClick={saveCustom} disabled={custSaving || !custName.trim() || !custInput.trim()}>
                {custSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                {ct.customDialog.saveBtn}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AudienceDetailModal audience={detailAud} open={!!detailAud} onClose={() => setDetailAud(null)}
        onSave={updated => {
          setAudiences(prev => prev.map(a => a.id === updated.id ? updated : a));
          setDetailAud(null);
        }} />
    </div>
  );
}
