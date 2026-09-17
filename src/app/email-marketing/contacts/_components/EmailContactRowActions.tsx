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
        className="rounded-lg p-1.5 text-white/40 hover:bg-white/10 hover:text-white transition-colors"
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {open && (
        <div className="absolute left-0 z-50 mt-1 w-44 rounded-xl border border-white/10 bg-[#04241b] p-1.5 shadow-2xl backdrop-blur-xl text-right">
          {contact.status === "SUBSCRIBED" ? (
            <button
              type="button"
              onClick={() => {
                onStatusChange(contact.id, "UNSUBSCRIBED");
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-amber-300 hover:bg-amber-500/10 transition-colors"
            >
              <UserX className="h-3.5 w-3.5" />
              <span>إلغاء الاشتراك</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                onStatusChange(contact.id, "SUBSCRIBED");
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-emerald-300 hover:bg-emerald-500/10 transition-colors"
            >
              <UserCheck className="h-3.5 w-3.5" />
              <span>إعادة التفعيل</span>
            </button>
          )}

          <div className="my-1 border-t border-white/5" />

          <button
            type="button"
            onClick={() => {
              onDelete(contact.id);
              setOpen(false);
            }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>حذف جهة الاتصال</span>
          </button>
        </div>
      )}
    </div>
  );
}
