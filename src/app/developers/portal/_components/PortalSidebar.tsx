"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Key,
  Settings,
  Code,
  Zap,
  FileText,
  Activity,
  LogOut,
  ChevronRight,
} from "lucide-react";

const NAV_ITEMS = [
  {
    label: "API Keys",
    href: "/developers/portal/api-keys",
    icon: Key,
  },
  {
    label: "OTP Settings",
    href: "/developers/portal/otp-templates",
    icon: Settings,
  },
  {
    label: "Quick Start",
    href: "/developers/portal/quick-start",
    icon: Code,
  },
  {
    label: "Live Tester",
    href: "/developers/portal/live-tester",
    icon: Zap,
  },
  {
    label: "Activity Logs",
    href: "/developers/portal/activity-logs",
    icon: Activity,
  },
  {
    label: "Endpoints",
    href: "/developers/portal/endpoints",
    icon: FileText,
  },
];

export default function PortalSidebar({ developer }: { developer: any }) {
  const pathname = usePathname();

  async function handleLogout() {
    await fetch("/api/developers/auth/logout", { method: "POST" });
    window.location.href = "/developers/signin";
  }

  return (
    <aside className="w-64 bg-[#0f0f0f] border-r border-white/5 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-white/5">
        <Link href="/developers" className="flex items-center gap-2.5">
          <span className="w-9 h-9 rounded-lg bg-[#25D366] flex items-center justify-center text-black font-bold text-lg">
            W
          </span>
          <div>
            <span className="text-white font-semibold text-sm">وني</span>
            <span className="text-white/40 text-sm"> / Developer</span>
          </div>
        </Link>
      </div>

      {/* Status Badge */}
      <div className="px-4 py-3">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/5">
          <div className="w-2 h-2 rounded-full bg-[#25D366] animate-pulse" />
          <span className="text-white/70 text-xs">{developer.metaConnection?.displayPhone || "متصل"}</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-2 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? "bg-[#25D366]/10 text-[#25D366] border border-[#25D366]/20"
                  : "text-white/60 hover:text-white hover:bg-white/5 border border-transparent"
              }`}
            >
              <Icon size={18} />
              {item.label}
              {isActive && <ChevronRight size={14} className="mr-auto" />}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-white/5">
        <div className="mb-3 px-3 py-2">
          <p className="text-white/40 text-xs truncate">{developer.email}</p>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-red-400/70 hover:text-red-400 hover:bg-red-500/10 transition-all"
        >
          <LogOut size={16} />
          تسجيل الخروج
        </button>
      </div>
    </aside>
  );
}
