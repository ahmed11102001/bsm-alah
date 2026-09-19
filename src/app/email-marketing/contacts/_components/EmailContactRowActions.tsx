"use client";

import { MoreVertical, Trash2, Edit2, UserCheck, UserX } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import type { EmailContactDTO } from "../../types";

export default function EmailContactRowActions({
  contact,
  onDelete,
  onStatusChange,
}: {
  contact: EmailContactDTO;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, newStatus: EmailContactDTO["status"]) => void;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {open && (
        <div className="absolute left-0 z-50 mt-1 w-44 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl text-right">
          {contact.status === "SUBSCRIBED" ? (
            <button
              type="button"
              onClick={() => {
                onStatusChange(contact.id, "UNSUBSCRIBED");
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-amber-700 hover:bg-amber-50 transition-colors font-medium"
            >
              <UserX className="h-3.5 w-3.5 text-amber-600" />
              <span>إلغاء الاشتراك</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                onStatusChange(contact.id, "SUBSCRIBED");
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-emerald-700 hover:bg-emerald-50 transition-colors font-medium"
            >
              <UserCheck className="h-3.5 w-3.5 text-emerald-600" />
              <span>إعادة التفعيل</span>
            </button>
          )}

          <div className="my-1 border-t border-slate-100" />

          <button
            type="button"
            onClick={() => {
              onDelete(contact.id);
              setOpen(false);
            }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors font-medium"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>حذف جهة الاتصال</span>
          </button>
        </div>
      )}
    </div>
  );
}
