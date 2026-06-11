"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Copy, Check, Bell } from "lucide-react";
import Link from "next/link";

const BREADCRUMBS: Record<string, string> = {
  "/developers/portal":                    "المشاريع",
  "/developers/portal/api-keys":           "API Keys",
  "/developers/portal/otp-templates":      "القوالب",
  "/developers/portal/quick-start":        "Quick Start",
  "/developers/portal/live-tester":        "Live Tester",
  "/developers/portal/activity-logs":      "Activity Logs",
  "/developers/portal/endpoints":          "API Docs",
};

export default function PortalHeader({ developer }: { developer: any }) {
  const [copied, setCopied] = useState(false);
  const pathname = usePathname();
  const activeKey = developer.apiKeys?.[0];

  const pageTitle = BREADCRUMBS[pathname]
    ?? Object.entries(BREADCRUMBS).find(([k]) => pathname.startsWith(k))?.[1]
    ?? "البورتال";

  async function copyKey() {
    if (!activeKey?.keyPrefix) return;
    await navigator.clipboard.writeText(activeKey.keyPrefix + "_live_xxxxxxxx");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600&family=Fira+Code:wght@400&display=swap');

        .portal-header {
          height: 56px;
          background: rgba(6,8,16,0.9);
          border-bottom: 1px solid rgba(255,255,255,0.05);
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 24px;
          backdrop-filter: blur(12px);
          font-family: 'IBM Plex Sans Arabic', sans-serif;
          direction: rtl;
          flex-shrink: 0;
        }

        .header-title {
          font-size: 15px; font-weight: 600; color: #fff;
        }
        .header-subtitle { font-size: 12px; color: rgba(255,255,255,0.3); }

        .header-right { display: flex; align-items: center; gap: 10px; }

        .api-key-badge {
          display: flex; align-items: center; gap: 7px;
          padding: 6px 12px;
          background: rgba(32,211,120,0.06);
          border: 1px solid rgba(32,211,120,0.15);
          border-radius: 8px;
          color: rgba(32,211,120,0.8);
          font-size: 12px; font-family: 'Fira Code', monospace;
          cursor: pointer; transition: background 0.2s;
        }
        .api-key-badge:hover { background: rgba(32,211,120,0.1); }

        .no-key-badge {
          display: flex; align-items: center; gap: 7px;
          padding: 6px 12px;
          background: rgba(245,158,11,0.06);
          border: 1px solid rgba(245,158,11,0.15);
          border-radius: 8px;
          color: rgba(245,158,11,0.7); font-size: 12px;
          text-decoration: none;
        }
        .no-key-badge:hover { background: rgba(245,158,11,0.1); }

        .notif-btn {
          width: 34px; height: 34px; border-radius: 8px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.07);
          display: flex; align-items: center; justify-content: center;
          color: rgba(255,255,255,0.35); cursor: pointer;
          transition: background 0.2s; position: relative;
        }
        .notif-btn:hover { background: rgba(255,255,255,0.07); color: rgba(255,255,255,0.6); }
      `}</style>

      <header className="portal-header">
        <div>
          <div className="header-title">{pageTitle}</div>
          <div className="header-subtitle">
            {developer.projects?.length
              ? `${developer.projects.length} مشروع نشط`
              : "لا توجد مشاريع بعد"}
          </div>
        </div>

        <div className="header-right">
          {activeKey ? (
            <button className="api-key-badge" onClick={copyKey} title="نسخ الـ API Key">
              {activeKey.keyPrefix}_••••••
              {copied
                ? <Check size={13} />
                : <Copy size={13} />
              }
            </button>
          ) : (
            <Link href="/developers/portal/api-keys" className="no-key-badge">
              ⚡ إنشاء API Key
            </Link>
          )}

          <button className="notif-btn" aria-label="إشعارات">
            <Bell size={15} />
          </button>
        </div>
      </header>
    </>
  );
}