"use client";

import { useState, useEffect, useCallback } from "react";
import EmailContactsTable from "./_components/EmailContactsTable";
import AddEmailContactModal from "./_components/AddEmailContactModal";
import ImportEmailContactsModal from "./_components/ImportEmailContactsModal";
import type { EmailContactDTO, EmailContactStatus } from "../types";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function EmailContactsPage() {
  const [contacts, setContacts] = useState<EmailContactDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);

  const loadContacts = useCallback(async () => {
    try {
      const res = await fetch("/api/email/contacts");
      const data = await res.json();
      if (res.ok && data.contacts) {
        setContacts(data.contacts);
      }
    } catch (err) {
      console.error("[EmailContactsPage] Failed to fetch contacts:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  const handleAddContact = async (newContact: EmailContactDTO) => {
    try {
      const res = await fetch("/api/email/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newContact),
      });
      const data = await res.json();
      if (res.ok) {
        setContacts((prev) => [data, ...prev]);
        toast.success(`تمت إضافة ${data.email} بنجاح إلى جهات الاتصال! 🎉`);
      } else {
        toast.error(data.error || "فشل إضافة جهة الاتصال");
      }
    } catch {
      toast.error("حدث خطأ في الشبكة أثناء الإضافة.");
    }
  };

  const handleImportContacts = async (imported: EmailContactDTO[]) => {
    try {
      const res = await fetch("/api/email/contacts/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contacts: imported }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`تم استيراد ${data.importedCount} جهات اتصال بنجاح! 🎉`);
        loadContacts();
      } else {
        toast.error(data.error || "فشل استيراد جهات الاتصال");
      }
    } catch {
      toast.error("حدث خطأ في الشبكة أثناء الاستيراد.");
    }
  };

  const handleDeleteContact = async (id: string) => {
    try {
      const res = await fetch(`/api/email/contacts/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setContacts((prev) => prev.filter((c) => c.id !== id));
        toast.success("تم حذف جهة الاتصال بنجاح.");
      } else {
        toast.error("فشل حذف جهة الاتصال.");
      }
    } catch {
      toast.error("حدث خطأ في الشبكة أثناء الحذف.");
    }
  };

  const handleStatusChange = async (id: string, newStatus: EmailContactStatus) => {
    try {
      const res = await fetch(`/api/email/contacts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setContacts((prev) =>
          prev.map((c) => (c.id === id ? { ...c, status: newStatus } : c))
        );
        toast.success("تم تحديث حالة اشتراك جهة الاتصال.");
      }
    } catch {
      toast.error("فشل تحديث الحالة.");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-black text-white">جهات الاتصال (Email Contacts)</h1>
        <p className="mt-1 text-sm text-white/60">
          إدارة المشتركين في حملاتك البريدية، تقسيمهم عبر الوسوم، واستيراد القوائم البريدية بسهولة.
        </p>
      </div>

      {/* Main Contacts Table */}
      <EmailContactsTable
        contacts={contacts}
        onDelete={handleDeleteContact}
        onStatusChange={handleStatusChange}
        onOpenAddModal={() => setIsAddOpen(true)}
        onOpenImportModal={() => setIsImportOpen(true)}
      />

      {/* Add Modal */}
      <AddEmailContactModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onAdd={handleAddContact}
      />

      {/* Import Modal */}
      <ImportEmailContactsModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImportComplete={handleImportContacts}
      />
    </div>
  );
}
