"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BookOpen, LogOut, ChevronDown, Menu } from "lucide-react";
import NotificationBell from "./NotificationBell";
import { useMobileNav } from "./MobileNavContext";

export default function PortalTopBar({
  developer,
}: {
  developer: { firstName: string; lastName: string; email: string };
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const { isMobileNavOpen, setMobileNavOpen } = useMobileNav();

  const fullName = `${developer.firstName ?? ""} ${developer.lastName ?? ""}`.trim() || developer.email;
  const initials = fullName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  async function handleLogout() {
    await fetch("/api/developers/auth/logout", { method: "POST" });
    window.location.href = "/developers/signin";
  }

  const docsActive = pathname.startsWith("/developers/portal/endpoints");

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600&family=Fira+Code:wght@400;500&display=swap');

        .ptopbar {
          height: 56px;
          flex-shrink: 0;
          position: sticky;
          top: 0;
          z-index: 50;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 24px;
          gap: 16px;
          background: rgba(6, 8, 16, 0.92);
          backdrop-filter: blur(14px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          direction: rtl;
          font-family: 'IBM Plex Sans Arabic', sans-serif;
        }

        /* ── Brand ─────────────────────────────────────────────── */
        .ptopbar-brand {
          display: flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
          flex-shrink: 0;
        }
        .ptopbar-brand-icon {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          flex-shrink: 0;
          object-fit: cover;
        }
        .ptopbar-brand-name {
          font-size: 15px;
          font-weight: 600;
          color: #fff;
        }
        .ptopbar-brand-badge {
          font-size: 11px;
          color: rgba(255, 255, 255, 0.35);
          padding: 2px 8px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 20px;
          white-space: nowrap;
        }

        /* ── Nav links ──────────────────────────────────────────── */
        .ptopbar-links {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .ptopbar-link {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 13px;
          color: rgba(255, 255, 255, 0.45);
          text-decoration: none;
          transition: color 0.15s, background 0.15s;
          white-space: nowrap;
        }
        .ptopbar-link:hover {
          color: rgba(255, 255, 255, 0.8);
          background: rgba(255, 255, 255, 0.05);
        }
        .ptopbar-link.active {
          color: #20d378;
          background: rgba(32, 211, 120, 0.08);
        }

        /* ── Actions ────────────────────────────────────────────── */
        .ptopbar-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }
        .ptopbar-icon-btn {
          width: 34px;
          height: 34px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.07);
          display: flex;
          align-items: center;
          justify-content: center;
          color: rgba(255, 255, 255, 0.35);
          cursor: pointer;
          transition: background 0.15s, color 0.15s;
        }
        .ptopbar-icon-btn:hover {
          background: rgba(255, 255, 255, 0.07);
          color: rgba(255, 255, 255, 0.6);
        }

        /* ── Profile / avatar ───────────────────────────────────── */
        .ptopbar-profile {
          position: relative;
        }
        .ptopbar-avatar-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 8px 4px 4px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.07);
          border-radius: 10px;
          cursor: pointer;
          color: rgba(255, 255, 255, 0.4);
          transition: background 0.15s, border-color 0.15s;
        }
        .ptopbar-avatar-btn:hover {
          background: rgba(255, 255, 255, 0.07);
          border-color: rgba(255, 255, 255, 0.12);
          color: rgba(255, 255, 255, 0.6);
        }
        .ptopbar-avatar {
          width: 26px;
          height: 26px;
          border-radius: 50%;
          background: rgba(32, 211, 120, 0.15);
          border: 1px solid rgba(32, 211, 120, 0.25);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 600;
          color: #20d378;
        }

        /* ── Dropdown menu ──────────────────────────────────────── */
        .ptopbar-overlay {
          position: fixed;
          inset: 0;
          z-index: 98;
        }
        .ptopbar-menu {
          position: absolute;
          top: calc(100% + 8px);
          left: 0;
          min-width: 200px;
          background: #0d1117;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 14px;
          z-index: 99;
          overflow: hidden;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
          padding: 8px 0;
          direction: rtl;
          font-family: 'IBM Plex Sans Arabic', sans-serif;
        }
        .menu-user-info {
          padding: 10px 14px 12px;
        }
        .menu-name {
          font-size: 13px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.85);
          margin-bottom: 2px;
        }
        .menu-email {
          font-size: 11px;
          color: rgba(255, 255, 255, 0.3);
          direction: ltr;
          text-align: right;
        }
        .menu-divider {
          height: 1px;
          background: rgba(255, 255, 255, 0.06);
          margin: 4px 0;
        }
        .menu-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 9px 14px;
          font-size: 13px;
          width: 100%;
          background: none;
          border: none;
          cursor: pointer;
          text-align: right;
          font-family: 'IBM Plex Sans Arabic', sans-serif;
          transition: background 0.12s;
          color: rgba(255, 255, 255, 0.5);
        }
        .menu-item:hover {
          background: rgba(255, 255, 255, 0.04);
          color: rgba(255, 255, 255, 0.75);
        }
        .menu-item.danger {
          color: rgba(239, 68, 68, 0.6);
        }
        .menu-item.danger:hover {
          background: rgba(239, 68, 68, 0.07);
          color: rgba(239, 68, 68, 0.9);
        }
        .mobile-menu-btn {
          display: none;
          background: none;
          border: none;
          color: #fff;
          cursor: pointer;
          padding: 8px;
          margin-right: -8px;
        }

        @media (max-width: 768px) {
          .ptopbar { padding: 0 16px; }
          .ptopbar-links { display: none; }
          .ptopbar-brand-name, .ptopbar-brand-badge { display: none; }
          .mobile-menu-btn { display: flex; align-items: center; justify-content: center; }
        }
      `}</style>

      <header className="ptopbar">
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button 
            className="mobile-menu-btn" 
            onClick={() => setMobileNavOpen(!isMobileNavOpen)}
            aria-label="Toggle Menu"
          >
            <Menu size={20} />
          </button>
          
          {/* 1. البراند */}
          <Link href="/developers/portal" className="ptopbar-brand">
            <img src="/favicon.svg" alt="وني" className="ptopbar-brand-icon" />
            <span className="ptopbar-brand-name">وني</span>
            <span className="ptopbar-brand-badge">Developer Portal</span>
          </Link>
        </div>

        {/* 2. روابط المطوّر العامة */}
        <nav className="ptopbar-links">
          <Link
            href="/developers/portal/endpoints"
            className={`ptopbar-link ${docsActive ? "active" : ""}`}
          >
            <BookOpen size={14} />
            API Docs
          </Link>
        </nav>

        {/* 3. إجراءات الحساب */}
        <div className="ptopbar-actions">
          <NotificationBell />

          <div className="ptopbar-profile">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="ptopbar-avatar-btn"
              aria-label="الملف الشخصي"
            >
              <div className="ptopbar-avatar">{initials}</div>
              <ChevronDown size={13} />
            </button>

            {menuOpen && (
              <>
                <div className="ptopbar-overlay" onClick={() => setMenuOpen(false)} />
                <div className="ptopbar-menu">
                  <div className="menu-user-info">
                    <div className="menu-name">{fullName}</div>
                    <div className="menu-email">{developer.email}</div>
                  </div>
                  <div className="menu-divider" />
                  <Link href="/developers/portal/settings" className="menu-item" style={{ textDecoration: 'none' }}>
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    إعدادات الحساب
                  </Link>
                  <button onClick={handleLogout} className="menu-item danger">
                    <LogOut size={14} />
                    تسجيل الخروج
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>
    </>
  );
}
