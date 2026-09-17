"use client";

import { useState } from "react";
import EmailContactsTable from "./_components/EmailContactsTable";
import AddEmailContactModal from "./_components/AddEmailContactModal";
import ImportEmailContactsModal from "./_components/ImportEmailContactsModal";
import { MOCK_CONTACTS } from "../constants";
import type { EmailContactDTO, EmailContactStatus } from "../types";
import { toast } from "sonner";

export default function EmailContactsPage() {
  const [contacts, setContacts] = useState<EmailContactDTO[]>(MOCK_CONTACTS);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);

  const handleAddContact = (newContact: EmailContactDTO) => {
    setContacts((prev) => [newContact, ...prev]);
  };

  const handleImportContacts = (newContacts: EmailContactDTO[]) => {
    setContacts((prev) => [...newContacts, ...prev]);
  };

  const handleDeleteContact = (id: string) => {
    setContacts((prev) => prev.filter((c) => c.id !== id));
    toast.success("تم حذف جهة الاتصال بنجاح.");
  };

  const handleStatusChange = (id: string, newStatus: EmailContactStatus) => {
    setContacts((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: newStatus } : c))
    );
    toast.success("تم تحديث حالة اشتراك جهة الاتصال.");
  };

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
