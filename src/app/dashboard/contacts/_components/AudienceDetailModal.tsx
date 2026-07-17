"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Edit2, Plus, Copy, X, Loader2 } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { normalizePhone, isValidPhone } from "./phone-utils";
import type { Audience, ContactRow } from "./types";

export function AudienceDetailModal({ audience, open, onClose, onSave }: {
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