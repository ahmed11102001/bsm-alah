"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { CheckCircle, Loader2, Edit2, Plus, Copy, X } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { normalizePhone, isValidPhone } from "@/app/dashboard/contacts/_components/phone-utils";
import type { Audience, ContactRow } from "@/app/dashboard/contacts/_components/types";

export function DemoAudienceDetailModal({ audience, open, onClose, onSave }: {
  audience: Audience | null;
  open: boolean;
  onClose: () => void;
  onSave: (audience: Audience) => void;
}) {
  const { t, dir } = useLanguage();
  const dm = t.contacts.detailModal;

  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [addPhone, setAddPhone] = useState("");
  const [addName, setAddName] = useState("");
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    if (audience) {
      setContacts(audience.contacts);
    }
    setEditMode(false);
    setAddPhone("");
    setAddName("");
  }, [audience]);

  if (!audience) return null;

  const isReadOnly = audience.type === "vip" || audience.type === "engaged" || audience.type === "no-response";

  const addContact = () => {
    const normalized = normalizePhone(addPhone);
    if (!isValidPhone(normalized)) {
      toast.error(dm.invalidPhone);
      return;
    }
    if (contacts.find(c => c.phone === normalized)) {
      toast.error(dm.duplicate);
      return;
    }
    setContacts(prev => [...prev, { id: crypto.randomUUID(), phone: normalized, name: addName || null }]);
    setAddPhone("");
    setAddName("");
  };

  const removeContact = (id: string) => setContacts(prev => prev.filter(c => c.id !== id));

  const copyPhone = (phone: string) => {
    navigator.clipboard.writeText(phone).then(() => toast.success(dm.copied));
  };

  const saveChanges = async () => {
    setSaving(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 200));
      const updated: Audience = {
        ...audience,
        contacts,
        contactCount: contacts.length,
      };
      onSave(updated);
      toast.success(dm.saved);
      setEditMode(false);
    } catch (error: any) {
      toast.error(error?.message ?? dm.saved);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg dark:bg-gray-800 dark:border-gray-700" dir={dir}>
        <DialogHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <DialogTitle className="text-lg font-bold dark:text-white">{audience.name}</DialogTitle>
              <DialogDescription className="dark:text-gray-400">{dm.contactCount(audience.contactCount)}</DialogDescription>
            </div>
            {!isReadOnly && (
              <Button size="sm" variant="outline" onClick={() => setEditMode(prev => !prev)}
                className="gap-1.5 dark:border-gray-600 dark:text-gray-300">
                <Edit2 className="w-3.5 h-3.5" />
                {editMode ? dm.cancel : dm.edit}
              </Button>
            )}
          </div>
        </DialogHeader>

        {editMode && (
          <div className="flex flex-col gap-2 bg-gray-50 dark:bg-gray-700/50 p-3 rounded-xl mb-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Input placeholder={dm.phonePlaceholder} value={addPhone} onChange={e => setAddPhone(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addContact()}
                className="text-sm dark:bg-gray-700 dark:border-gray-600" />
              <Input placeholder={dm.namePlaceholder} value={addName} onChange={e => setAddName(e.target.value)}
                className="text-sm dark:bg-gray-700 dark:border-gray-600" />
            </div>
            <Button size="sm" className="bg-green-500 hover:bg-green-600 text-white gap-1.5"
              onClick={addContact}>
              <Plus className="w-4 h-4" /> {dm.addContact}
            </Button>
          </div>
        )}

        <div className="overflow-y-auto max-h-72 space-y-1.5 pr-1">
          {contacts.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">{dm.noContacts}</p>
          ) : contacts.map(contact => (
            <div key={contact.id}
              className="flex items-center gap-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl px-3 py-2.5 group">
              <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-xs font-bold text-gray-600 dark:text-gray-300 flex-shrink-0">
                {(contact.name ?? contact.phone).slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                {contact.name && <p className="text-sm font-medium text-gray-800 dark:text-white truncate">{contact.name}</p>}
                <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">{contact.phone}</p>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => copyPhone(contact.phone)}
                  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                  <Copy className="w-3.5 h-3.5" />
                </button>
                {editMode && (
                  <button onClick={() => removeContact(contact.id)}
                    className="p-1 text-red-400 hover:text-red-600">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
          {editMode ? (
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 dark:border-gray-600 dark:text-gray-300" onClick={onClose}>
                {dm.closeBtn}
              </Button>
              <Button className="flex-1 bg-green-500 hover:bg-green-600 text-white gap-1.5"
                onClick={saveChanges} disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {dm.saveBtn}
              </Button>
            </div>
          ) : (
            <Button variant="outline" className="w-full dark:border-gray-600 dark:text-gray-300" onClick={onClose}>
              {dm.closeBtn}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
