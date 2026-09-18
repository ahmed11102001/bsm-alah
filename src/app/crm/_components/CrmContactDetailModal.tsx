"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Trash2, MessageCircle, Mail } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { tx, type CrmContact } from "../types";

interface Props {
  contactId: string | null;
  onClose: () => void;
  onSaved: (contact: CrmContact) => void;
  onDeleted: (id: string) => void;
}

const CODE_MSG: Record<string, { ar: string; en: string }> = {
  PHONE_OR_EMAIL_REQUIRED: { ar: "لازم رقم أو إيميل على الأقل — مينفعش تمسح الاتنين", en: "Phone or email is required" },
  INVALID_PHONE: { ar: "رقم الهاتف غير صحيح", en: "Invalid phone number" },
  INVALID_EMAIL: { ar: "الإيميل غير صحيح", en: "Invalid email" },
  CONFLICT: { ar: "الرقم أو الإيميل مرتبط بعميل تاني", en: "Phone or email belongs to another contact" },
  NOT_FOUND: { ar: "العميل مش موجود", en: "Contact not found" },
};

export default function CrmContactDetailModal({ contactId, onClose, onSaved, onDeleted }: Props) {
  const { locale, dir } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [contact, setContact] = useState<CrmContact | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [tags, setTags] = useState("");
  const [notes, setNotes] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!contactId) return;
    setLoading(true); setErr(""); setConfirmDelete(false);
    fetch(`/api/crm/contacts/${contactId}`)
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(d.code || "ERR");
        const c = d.contact as CrmContact;
        setContact(c);
        setName(c.name ?? "");
        setPhone(c.phone ?? "");
        setEmail(c.email ?? "");
        setTags((c.tags ?? []).join(", "));
        setNotes(c.notes ?? "");
      })
      .catch(() => setErr(tx("تعذر تحميل العميل", "Failed to load contact", locale)))
      .finally(() => setLoading(false));
  }, [contactId, locale]);

  const save = async () => {
    if (!contactId) return;
    setErr(""); setBusy(true);
    try {
      const r = await fetch(`/api/crm/contacts/${contactId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || null,
          phone, email,
          tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
          notes: notes.trim() || null,
        }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        const m = CODE_MSG[d.code];
        setErr(m ? tx(m.ar, m.en, locale) : d.error || tx("حصل خطأ", "Something went wrong", locale));
        return;
      }
      onSaved(d.contact);
      onClose();
    } catch {
      setErr(tx("حصل خطأ في الاتصال", "Connection error", locale));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!contactId) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/crm/contacts/${contactId}`, { method: "DELETE" });
      if (!r.ok) throw new Error();
      onDeleted(contactId);
      onClose();
    } catch {
      setErr(tx("تعذر الحذف", "Failed to delete", locale));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={!!contactId} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md dark:bg-gray-800 dark:border-gray-700" dir={dir}>
        <DialogHeader>
          <DialogTitle className="dark:text-white flex items-center gap-2">
            {tx("بيانات العميل", "Customer details", locale)}
            {contact && (
              <span className="flex items-center gap-1">
                {contact.phone && (
                  <span className="w-6 h-6 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <MessageCircle className="w-3.5 h-3.5 text-green-600" />
                  </span>
                )}
                {contact.email && (
                  <span className="w-6 h-6 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <Mail className="w-3.5 h-3.5 text-blue-600" />
                  </span>
                )}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-8 space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 rounded-xl bg-gray-100 dark:bg-gray-700 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-3.5">
            <div>
              <Label className="text-sm dark:text-gray-300">{tx("الاسم", "Name", locale)}</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 dark:bg-gray-700 dark:border-gray-600" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-sm dark:text-gray-300">{tx("الرقم", "Phone", locale)}</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} dir="ltr" className="mt-1 dark:bg-gray-700 dark:border-gray-600" />
              </div>
              <div>
                <Label className="text-sm dark:text-gray-300">{tx("الإيميل", "Email", locale)}</Label>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" className="mt-1 dark:bg-gray-700 dark:border-gray-600" />
              </div>
            </div>
            <div>
              <Label className="text-sm dark:text-gray-300">{tx("التاجز (افصل بفاصلة)", "Tags (comma separated)", locale)}</Label>
              <Input value={tags} onChange={(e) => setTags(e.target.value)} className="mt-1 dark:bg-gray-700 dark:border-gray-600" />
            </div>
            <div>
              <Label className="text-sm dark:text-gray-300">{tx("ملاحظات", "Notes", locale)}</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="mt-1 dark:bg-gray-700 dark:border-gray-600" />
            </div>
            {contact && (
              <p className="text-xs text-gray-400">
                {tx("أُضيف:", "Added:", locale)} {new Date(contact.createdAt).toLocaleDateString(locale === "ar" ? "ar-EG" : "en-US")}
              </p>
            )}
            {err && <p className="text-sm text-red-500">{err}</p>}
            <div className="flex gap-2">
              <Button onClick={save} disabled={busy} className="flex-1 bg-[#25D366] hover:bg-[#20bb5a] text-white">
                {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                {tx("حفظ", "Save", locale)}
              </Button>
              {confirmDelete ? (
                <>
                  <Button onClick={remove} disabled={busy} className="flex-1 bg-red-500 hover:bg-red-600 text-white">
                    {tx("تأكيد الحذف", "Confirm delete", locale)}
                  </Button>
                  <Button variant="outline" onClick={() => setConfirmDelete(false)} className="dark:border-gray-600">
                    {tx("تراجع", "Cancel", locale)}
                  </Button>
                </>
              ) : (
                <Button variant="outline" onClick={() => setConfirmDelete(true)}
                  className="border-red-200 text-red-500 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20">
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
