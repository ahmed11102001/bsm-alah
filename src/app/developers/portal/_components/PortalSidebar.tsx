"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FolderOpen, ChevronLeft } from "lucide-react";

const NAV_ITEMS = [
  { label: "المشاريع", href: "/developers/portal", icon: FolderOpen, exact: true },
];

export default function PortalSidebar({ developer }: { developer: any }) {
  const pathname = usePathname();

  const fullName =
    `${developer.firstName ?? ""} ${developer.lastName ?? ""}`.trim() ||
    developer.name ||
    developer.email;

  const initials = fullName
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600&family=Fira+Code:wght@400;500&display=swap');

        .sidebar {
          width: 240px;
          height: 100%;
          background: rgba(255,255,255,0.015);
          border-left: 1px solid rgba(255,255,255,0.06);
          display: flex;
          flex-direction: column;
          font-family: 'IBM Plex Sans Arabic', sans-serif;
          direction: rtl;
          flex-shrink: 0;
        }

        .sidebar-nav { flex: 1; padding: 16px 10px; }
        .nav-section-label {
          font-size: 10px; font-weight: 600;
          color: rgba(255,255,255,0.25);
          text-transform: uppercase; letter-spacing: 0.8px;
          padding: 8px 10px 6px;
        }

        .nav-item {
          display: flex; align-items: center; gap: 10px;
          padding: 9px 12px; border-radius: 10px;
          font-size: 13.5px; font-weight: 400;
          color: rgba(255,255,255,0.45);
          text-decoration: none;
          transition: background 0.15s, color 0.15s;
          margin-bottom: 2px;
          cursor: pointer; border: none;
          width: 100%; background: none; text-align: right;
          font-family: 'IBM Plex Sans Arabic', sans-serif;
        }
        .nav-item:hover { background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.75); }
        .nav-item.active {
          background: rgba(32,211,120,0.1);
          color: #20d378;
          font-weight: 500;
        }
        .nav-item svg { flex-shrink: 0; }

        /* User profile at bottom */
        .sidebar-user {
          padding: 12px 14px;
          border-top: 1px solid rgba(255,255,255,0.05);
          display: flex; align-items: center; gap: 10px;
        }
        .user-avatar {
          width: 34px; height: 34px; border-radius: 50%;
          background: rgba(32,211,120,0.12);
          border: 1px solid rgba(32,211,120,0.2);
          display: flex; align-items: center; justify-content: center;
          font-size: 13px; font-weight: 600; color: #20d378;
          flex-shrink: 0;
        }
        .user-name { font-size: 13px; font-weight: 500; color: rgba(255,255,255,0.7); }
        .user-email { font-size: 11px; color: rgba(255,255,255,0.3); direction: ltr; text-align: right; }
      `}</style>

      <aside className="sidebar">
        {/* Nav — التنقل السياقي فقط */}
        <nav className="sidebar-nav">
          <div className="nav-section-label">الرئيسية</div>

          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-item ${isActive ? "active" : ""}`}
              >
                <Icon size={15} />
                {item.label}
                {isActive && (
                  <ChevronLeft size={13} style={{ marginRight: "auto", opacity: 0.5 }} />
                )}
              </Link>
            );
          })}
        </nav>

        {/* User info */}
        <div className="sidebar-user">
          <div className="user-avatar">{initials}</div>
          <div>
            <div className="user-name">{fullName}</div>
            <div className="user-email">{developer.email}</div>
          </div>
        </div>
      </aside>
    </>
  );
}
