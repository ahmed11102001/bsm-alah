"use client";

// دوال مساعدة نقية — نُقلت من chat/page.tsx

import { t, type Lang } from "./i18n";

export const avatarColor = (id: string) => {
  const colors = [
    "bg-teal-500", "bg-green-500", "bg-blue-500",
    "bg-purple-500", "bg-pink-500", "bg-orange-500", "bg-cyan-500",
  ];
  const n = id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return colors[n % colors.length];
};

export function initials(contact: { name: string | null; phone: string }) {
  const value = contact.name?.trim() || contact.phone;
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function mediaSrc(mediaUrl: string, opts?: { download?: boolean }) {
  if (/^https?:\/\//i.test(mediaUrl)) return mediaUrl;
  const base = `/api/chat/media/${encodeURIComponent(mediaUrl)}`;
  return opts?.download ? `${base}?download=1` : base;
}

export function linkify(text: string) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, i) =>
    urlRegex.test(part) ? (
      <a
        key={i}
        href={part}
        target="_blank"
        rel="noopener noreferrer"
        onClick={e => e.stopPropagation()}
        className="underline text-blue-400 break-all"
      >
        {part}
      </a>
    ) : part
  );
}


export function timeStr(iso: string) {
  return new Date(iso).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
}

export function dateStr(iso: string, lang: Lang) {
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return t[lang].today_label;
  const yest = new Date(today); yest.setDate(today.getDate() - 1);
  if (d.toDateString() === yest.toDateString()) return t[lang].yesterday;
  return d.toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US", { month: "short", day: "numeric" });
}
