"use client";

import {
  Users, MoreVertical, Eye, Edit2, Trash2, UserPlus, MessageSquareDashed, ChevronRight, Sheet,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLanguage } from "@/lib/language-context";
import { useRouter } from "next/navigation";
import type { Audience } from "./types";

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
    google_sheets: {
      bg: "bg-green-50 dark:bg-green-900/20", border: "border-green-200 dark:border-green-800",
      icon: <Sheet className="w-5 h-5 text-green-600 dark:text-green-400" />,
      badge: "Google Sheets", badgeColor: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
    },
  };
}

export function AudienceCard({ audience, onEdit, onDelete }: {
  audience: Audience; onView: () => void; onEdit: () => void; onDelete: () => void;
}) {
  const { t, locale } = useLanguage();
  const router = useRouter();
  const c = t.contacts.card;
  const cfg = getTypeConfig(t)[audience.type as "no-response" | "custom" | "excel" | "google_sheets"] ?? getTypeConfig(t).excel;
  const numFmt = (n: number) => n.toLocaleString(locale === "ar" ? "ar-EG" : "en-US");
  const viewDetails = () => router.push(`/dashboard/contacts/audience/${encodeURIComponent(audience.id)}`);

  return (
    <div className={`${cfg.bg} ${cfg.border} border rounded-2xl p-4 flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`w-10 h-10 rounded-xl ${cfg.bg} border ${cfg.border} flex items-center justify-center shrink-0`}>
            {cfg.icon}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 dark:text-white text-sm leading-tight truncate">{audience.name}</p>
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
              <DropdownMenuItem className="gap-2 text-sm cursor-pointer" onClick={viewDetails}>
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
          <button onClick={viewDetails} className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-gray-400">
            <Eye className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex items-center gap-1.5 text-2xl font-bold text-gray-800 dark:text-white">
        {numFmt(audience.contactCount)}
        <span className="text-sm font-normal text-gray-400 dark:text-gray-500">{c.contact}</span>
      </div>

      <div className="space-y-1.5">
        {audience.contacts.slice(0, 3).map((ct) => (
          <div key={ct.id} className="flex items-center gap-2 rounded-xl bg-white/70 px-2.5 py-1.5 dark:bg-gray-700/50">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-[9px] font-bold text-gray-500 dark:bg-gray-600 dark:text-gray-300">
              {(ct.name ?? ct.phone).slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-medium text-gray-700 dark:text-gray-200">
                {ct.name || "بدون اسم"}
              </p>
              <p className="truncate font-mono text-[10px] text-gray-400">{ct.phone}</p>
            </div>
          </div>
        ))}
        {audience.contactCount > 3 && (
          <p className="px-1 text-[11px] font-medium text-gray-400 dark:text-gray-500">
            +{numFmt(audience.contactCount - 3)} عميل آخر
          </p>
        )}
      </div>

      <button onClick={viewDetails}
        className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200
        flex items-center gap-1 mt-auto">
        {c.viewDetails} <ChevronRight className="w-3 h-3" />
      </button>
    </div>
  );
}
