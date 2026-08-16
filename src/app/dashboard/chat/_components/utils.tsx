"use client";

// دوال مساعدة نقية — نُقلت من chat/page.tsx

import { t, type Lang } from "./i18n";
import type { ReactNode } from "react";

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

const URL_PATTERN = /(?:https?:\/\/|www\.)[^\s<>"'`]+/giu;

function trimUrlPunctuation(value: string) {
  let url = value;
  let trailing = "";

  while (/[.,!?;:،؛…]$/.test(url)) {
    trailing = url.slice(-1) + trailing;
    url = url.slice(0, -1);
  }

  // Remove closing punctuation only when it is not balanced inside the URL.
  const pairs: Array<[string, string]> = [["(", ")"], ["[", "]"], ["{", "}"]];
  for (const [opening, closing] of pairs) {
    while (url.endsWith(closing) && (url.match(new RegExp(`\\${closing}`, "g"))?.length ?? 0) > (url.match(new RegExp(`\\${opening}`, "g"))?.length ?? 0)) {
      trailing = closing + trailing;
      url = url.slice(0, -1);
    }
  }

  return { url, trailing };
}

function safeHref(value: string) {
  const href = /^www\./i.test(value) ? `https://${value}` : value;
  try {
    const parsed = new URL(href);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? href : null;
  } catch {
    return null;
  }
}

export function linkify(text: string) {
  const nodes: ReactNode[] = [];
  let cursor = 0;
  let key = 0;

  for (const match of text.matchAll(URL_PATTERN)) {
    const raw = match[0];
    const start = match.index ?? cursor;
    const { url, trailing } = trimUrlPunctuation(raw);
    const href = safeHref(url);

    if (!href || !url) continue;
    if (start > cursor) nodes.push(text.slice(cursor, start));
    nodes.push(
      <a
        key={`url-${key++}`}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={e => e.stopPropagation()}
        className="text-blue-400 underline underline-offset-2 break-all cursor-pointer hover:text-blue-300"
        dir="ltr"
      >
        {url}
      </a>
    );
    if (trailing) nodes.push(trailing);
    cursor = start + raw.length;
  }

  if (cursor < text.length) nodes.push(text.slice(cursor));
  return nodes.length ? nodes : text;
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
