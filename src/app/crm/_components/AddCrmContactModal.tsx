"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, UserPlus } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { tx, type CrmContact } from "../types";

const CODE_MSG: Record<string, { ar: string; en: string }> = {
  NAME_REQUIRED: { ar: "الاسم مطلوب", en: "Name is required" },
  PHONE_OR_EMAIL_REQUIRED: { ar: "لازم رقم أو إيميل على الأقل", en: "Phone or email is required" },
  INVALID_BIRTHDATE: { ar: "تاريخ الميلاد غير صحيح", en: "Invalid birth date" },
};

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onAdded: (contact: CrmContact, created: boolean) => void;
}

export default function AddCrmContactModal({ open, onOpenChange, onAdded }: Props) {
  const { locale, dir } = useLanguage();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [tags, setTags] = useState("");
  const [notes, setNotes] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [city, setCity] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setName(""); setPhone(""); setEmail(""); setTags(""); setNotes("");
    setBirthDate(""); setCity(""); setErr("");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    if (!name.trim()) { setErr(tx("الاسم مطلوب", "Name is required", locale)); return; }
    if (!phone.trim() && !email.trim()) {
      setErr(tx("لازم رقم أو إيميل على الأقل", "Phone or email is required", locale));
      return;
    }
    setBusy(true);
    try {
      const r = await fetch("/api/crm/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
          notes: notes.trim() || undefined,
          birthDate: birthDate || undefined,
          city: city.trim() || undefined,
        }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        const m = CODE_MSG[d.code];
        setErr(m ? tx(m.ar, m.en, locale) : d.error || tx("حصل خطأ", "Something went wrong", locale));
        return;
      }
      onAdded(d.contact, d.created);
      reset();
      onOpenChange(false);
    } catch {
      setErr(tx("حصل خطأ في الاتصال", "Connection error", locale));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-md dark:bg-gray-800 dark:border-gray-700" dir={dir}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 dark:text-white">
            <UserPlus className="w-5 h-5 text-[#25D366]" />
            {tx("إضافة عميل", "Add customer", locale)}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3.5">
          <div>
            <Label className="text-sm dark:text-gray-300">{tx("الاسم", "Name", locale)} *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={tx("اسم العميل", "Customer name", locale)}
              className="mt-1 dark:bg-gray-700 dark:border-gray-600" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-sm dark:text-gray-300">{tx("الرقم (واتساب)", "Phone (WhatsApp)", locale)}</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01xxxxxxxxx" dir="ltr"
                className="mt-1 dark:bg-gray-700 dark:border-gray-600" />
            </div>
            <div>
              <Label className="text-sm dark:text-gray-300">{tx("الإيميل", "Email", locale)}</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="mail@example.com" dir="ltr"
                className="mt-1 dark:bg-gray-700 dark:border-gray-600" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-sm dark:text-gray-300">{tx("تاريخ الميلاد (اختياري)", "Birth date (optional)", locale)}</Label>
              <Input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)}
                className="mt-1 dark:bg-gray-700 dark:border-gray-600" />
            </div>
            <div>
              <Label className="text-sm dark:text-gray-300">{tx("المدينة (اختياري)", "City (optional)", locale)}</Label>
              <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder={tx("القاهرة", "Cairo", locale)}
                className="mt-1 dark:bg-gray-700 dark:border-gray-600" />
            </div>
          </div>
          <div>
            <Label className="text-sm dark:text-gray-300">{tx("التاجز (افصل بفاصلة)", "Tags (comma separated)", locale)}</Label>
            <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="vip, Cairo"
              className="mt-1 dark:bg-gray-700 dark:border-gray-600" />
          </div>
          <div>
            <Label className="text-sm dark:text-gray-300">{tx("ملاحظات", "Notes", locale)}</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
              className="mt-1 dark:bg-gray-700 dark:border-gray-600" />
          </div>
          {err && <p className="text-sm text-red-500">{err}</p>}
          <Button type="submit" disabled={busy} className="w-full bg-[#25D366] hover:bg-[#20bb5a] text-white">
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            {tx("إضافة", "Add", locale)}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
