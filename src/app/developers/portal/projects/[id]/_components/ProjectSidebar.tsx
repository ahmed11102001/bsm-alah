"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard, Key, FileText, Activity,
  ChevronLeft, ChevronDown, Check, Plus,
  Share2, Code, Zap, X, BarChart2, CreditCard
} from "lucide-react";
import { useMobileNav } from "../../../_components/MobileNavContext";

import { useLanguage } from "../../../../_components/LanguageProvider";

interface Project {
  id: string;
  name: string;
  status: string;
}

function getNavItems(projectId: string, t: (en: string, ar: string) => string) {
  return [
    { label: t("Overview", "نظرة عامة"),    href: `/developers/portal/projects/${projectId}`,               icon: LayoutDashboard, exact: true },
    { label: "API Keys",     href: `/developers/portal/projects/${projectId}/api-keys`,      icon: Key },
    { label: t("Templates", "القوالب"),      href: `/developers/portal/projects/${projectId}/otp-templates`, icon: FileText },
    { label: t("Quick Start", "البدء السريع"), href: `/developers/portal/projects/${projectId}/quick-start`,   icon: Code },
    { label: "Live Tester",  href: `/developers/portal/projects/${projectId}/live-tester`,   icon: Zap },
    { label: t("Activity Logs", "السجلات"),      href: `/developers/portal/projects/${projectId}/activity-logs`, icon: Activity },
    { label: t("Billing", "الباقة"), href: `/developers/portal/projects/${projectId}/billing`, icon: CreditCard },
    { label: t("Transfer Project", "تسليم المشروع"),href: `/developers/portal/projects/${projectId}/transfer`,      icon: Share2 },
  ];
}

export default function ProjectSidebar({
  developer,
  project,
  allProjects,
  viewerRole,
}: {
  developer: any;
  project: any;
  allProjects: Project[];
  viewerRole: "owner" | "developer";
}) {
  const pathname = usePathname();
  const [showSwitcher, setShowSwitcher] = useState(false);
  const { isMobileNavOpen, setMobileNavOpen } = useMobileNav();
  const { language, t } = useLanguage();

  const NAV_ITEMS = getNavItems(project.id, t);
  const metaConnected = !!project.metaConnection?.isVerified;

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

        .psidebar {
          width: 240px;
          height: 100%;
          background: rgba(255,255,255,0.015);
          border-left: ${language === 'ar' ? '1px solid rgba(255,255,255,0.06)' : 'none'};
          border-right: ${language === 'en' ? '1px solid rgba(255,255,255,0.06)' : 'none'};
          display: flex; flex-direction: column;
          font-family: 'IBM Plex Sans Arabic', sans-serif;
          direction: ${language === 'ar' ? 'rtl' : 'ltr'}; flex-shrink: 0; position: relative;
        }

        /* Project switcher */
        .project-switcher {
          margin: 14px 10px 0;
          padding: 10px 12px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 10px;
          cursor: pointer;
          display: flex; align-items: center; justify-content: space-between;
          gap: 8px; transition: background 0.15s, border-color 0.15s;
        }
        .project-switcher:hover {
          background: rgba(255,255,255,0.07);
          border-color: rgba(255,255,255,0.12);
        }
        .project-switcher-label { font-size: 10px; color: rgba(255,255,255,0.3); margin-bottom: 2px; }
        .project-switcher-name  { font-size: 13px; font-weight: 500; color: #fff; }
        .project-switcher-icon  { color: rgba(255,255,255,0.3); flex-shrink: 0; }

        /* Dropdown */
        .project-dropdown {
          position: absolute; top: 76px; right: 10px; left: 10px;
          background: #0d1117;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px; z-index: 100;
          overflow: hidden;
          box-shadow: 0 8px 32px rgba(0,0,0,0.5);
        }
        .dropdown-header {
          padding: 10px 14px 8px;
          font-size: 11px; font-weight: 600;
          color: rgba(255,255,255,0.3);
          text-transform: uppercase; letter-spacing: 0.8px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        .dropdown-item {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 14px; cursor: pointer;
          font-size: 13px; color: rgba(255,255,255,0.7);
          transition: background 0.1s; text-decoration: none;
        }
        .dropdown-item:hover { background: rgba(255,255,255,0.05); }
        .dropdown-item.active { color: #20d378; }
        .dropdown-item-new {
          border-top: 1px solid rgba(255,255,255,0.06);
          color: rgba(255,255,255,0.4);
        }
        .dropdown-item-new:hover { background: rgba(32,211,120,0.05); color: #20d378; }

        /* Nav */
        .psidebar-nav { flex: 1; padding: 12px 10px; }
        .nav-section-label {
          font-size: 10px; font-weight: 600;
          color: rgba(255,255,255,0.25);
          text-transform: uppercase; letter-spacing: 0.8px;
          padding: 8px 10px 6px;
        }
        .pnav-item {
          display: flex; align-items: center; gap: 10px;
          padding: 9px 12px; border-radius: 10px;
          font-size: 13.5px; font-weight: 400;
          color: rgba(255,255,255,0.45);
          text-decoration: none;
          transition: background 0.15s, color 0.15s;
          margin-bottom: 2px;
          cursor: pointer; border: none;
          width: 100%; background: none; text-align: ${language === 'ar' ? 'right' : 'left'};
          font-family: 'IBM Plex Sans Arabic', sans-serif;
        }
        .pnav-item:hover { background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.75); }
        .pnav-item.active { background: rgba(32,211,120,0.1); color: #20d378; font-weight: 500; }
        .pnav-item svg { flex-shrink: 0; }

        /* Meta badge */
        .meta-badge {
          margin: 0 10px 10px;
          padding: 9px 12px;
          border-radius: 10px;
          display: flex; align-items: center; gap: 8px;
          font-size: 12px; cursor: pointer; text-decoration: none;
        }
        .meta-badge.connected {
          background: rgba(32,211,120,0.08);
          border: 1px solid rgba(32,211,120,0.15);
          color: rgba(32,211,120,0.8);
        }
        .meta-badge.disconnected {
          background: rgba(245,158,11,0.07);
          border: 1px solid rgba(245,158,11,0.15);
          color: rgba(245,158,11,0.7);
        }
        .meta-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
        .meta-badge.connected .meta-dot    { background: #20d378; }
        .meta-badge.disconnected .meta-dot { background: #f59e0b; }

        /* Divider */
        .divider { height: 1px; background: rgba(255,255,255,0.04); margin: 6px 10px; }

        /* User */
        .psidebar-user {
          padding: 12px 14px;
          border-top: 1px solid rgba(255,255,255,0.05);
          display: flex; align-items: center; gap: 10px;
        }
        .user-avatar {
          width: 32px; height: 32px; border-radius: 50%;
          background: rgba(32,211,120,0.12);
          border: 1px solid rgba(32,211,120,0.2);
          display: flex; align-items: center; justify-content: center;
          font-size: 12px; font-weight: 600; color: #20d378; flex-shrink: 0;
        }
        .user-name  { font-size: 12px; font-weight: 500; color: rgba(255,255,255,0.7); }
        .user-email { font-size: 10px; color: rgba(255,255,255,0.3); direction: ltr; text-align: ${language === 'ar' ? 'right' : 'left'}; }

        @media (max-width: 768px) {
          .psidebar-overlay {
            position: fixed; inset: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px);
            z-index: 100; display: block;
          }
          .psidebar {
            position: fixed; top: 0; right: 0; bottom: 0; z-index: 101;
            transform: translateX(100%); transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            background: #060810; border-left: none; width: 260px;
          }
          .psidebar.mobile-open { transform: translateX(0); }
          .mobile-close-btn {
            display: flex !important; align-items: center; justify-content: flex-end; padding: 16px 16px 0;
          }
          .mobile-close-btn button {
            background: none; border: none; color: rgba(255,255,255,0.5); cursor: pointer; padding: 4px; display: flex;
          }
        }
      `}</style>

      {isMobileNavOpen && (
        <div className="psidebar-overlay" onClick={() => setMobileNavOpen(false)} />
      )}

      <aside className={`psidebar ${isMobileNavOpen ? 'mobile-open' : ''}`}>
        <div className="mobile-close-btn" style={{ display: 'none' }}>
          <button onClick={() => setMobileNavOpen(false)}>
             <X size={20} />
          </button>
        </div>
        {/* Project switcher — بدون لوجو لأنه موجود في TopBar */}
        <div
          className="project-switcher"
          onClick={() => setShowSwitcher((v) => !v)}
        >
          <div>
            <div className="project-switcher-label" style={{ textAlign: language === 'ar' ? 'right' : 'left' }}>{t("Current Project", "المشروع الحالي")}</div>
            <div className="project-switcher-name" style={{ textAlign: language === 'ar' ? 'right' : 'left' }}>{project.name}</div>
          </div>
          <ChevronDown size={14} className="project-switcher-icon" />
        </div>

        {/* Projects dropdown */}
        {showSwitcher && (
          <>
            <div
              style={{ position: "fixed", inset: 0, zIndex: 99 }}
              onClick={() => setShowSwitcher(false)}
            />
            <div className="project-dropdown" style={{ direction: language === "ar" ? "rtl" : "ltr" }}>
              <div className="dropdown-header" style={{ textAlign: language === 'ar' ? 'right' : 'left' }}>{t("Change Project", "تغيير المشروع")}</div>
              {allProjects.map((p) => (
                <Link
                  key={p.id}
                  href={`/developers/portal/projects/${p.id}`}
                  className={`dropdown-item ${p.id === project.id ? "active" : ""}`}
                  onClick={() => setShowSwitcher(false)}
                >
                  {p.id === project.id && <Check size={12} />}
                  {p.name}
                </Link>
              ))}
              {viewerRole === "developer" && (
                <Link
                  href="/developers/portal"
                  className="dropdown-item dropdown-item-new"
                  onClick={() => setShowSwitcher(false)}
                >
                  <Plus size={12} />
                  {t("New Project", "مشروع جديد")}
                </Link>
              )}
            </div>
          </>
        )}

        {/* Nav — تبويبات المشروع فقط */}
        <nav className="psidebar-nav">
          <div className="nav-section-label" style={{ textAlign: language === 'ar' ? 'right' : 'left' }}>{t("Project", "المشروع")}</div>

          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              "exact" in item && item.exact
                ? pathname === item.href
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`pnav-item ${isActive ? "active" : ""}`}
              >
                <Icon size={14} />
                {item.label}
                {isActive && (
                  <ChevronLeft size={12} style={{ marginLeft: language === 'ar' ? "0" : "auto", marginRight: language === 'ar' ? "auto" : "0", opacity: 0.5, transform: language === 'ar' ? 'none' : 'rotate(180deg)' }} />
                )}
              </Link>
            );
          })}

          <div className="divider" />

          {/* Meta status */}
          <Link
            href={`/developers/portal/projects/${project.id}`}
            className={`meta-badge ${metaConnected ? "connected" : "disconnected"}`}
          >
            <div className="meta-dot" />
            <span>
              {metaConnected
                ? `Meta • ${project.metaConnection?.displayPhone || t("Connected", "متصل")}`
                : t("Not Connected • Meta", "غير مربوط • Meta")}
            </span>
            {!metaConnected && (
              <span style={{ fontSize: 11, marginLeft: language === 'ar' ? "0" : "auto", marginRight: language === 'ar' ? "auto" : "0", opacity: 0.7 }}>{t("Connect", "ربط")} {language === 'ar' ? '←' : '→'}</span>
            )}
          </Link>
        </nav>

        {/* User */}
        <div className="psidebar-user">
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
