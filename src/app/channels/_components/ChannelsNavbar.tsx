"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { LogOut, User, Layers, ChevronDown, Settings } from "lucide-react";

export default function ChannelsNavbar({ initialUser }: { initialUser?: { name?: string | null; email?: string | null } }) {
  const { data: session } = useSession();
  const userName = session?.user?.name || initialUser?.name || "المستخدم";
  const userEmail = session?.user?.email || initialUser?.email || "";
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMenuOpen(false); };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#041a14]/80 backdrop-blur-xl transition-all">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 shadow-lg shadow-emerald-500/20">
            <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-[#04241b]">
              <Image
                src="/faviconlink.svg"
                alt="Wani Logo"
                width={24}
                height={24}
                className="h-6 w-6 object-contain"
                priority
              />
            </div>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-lg font-extrabold tracking-wider text-white">WANI</span>
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">
                <Layers className="h-3 w-3" />
                مركز القنوات
              </span>
            </div>
            <span className="text-[11px] text-emerald-100/60">منظومة القنوات الموحدة</span>
          </div>
        </div>

        {/* User profile & actions */}
        <div className="relative flex items-center gap-3" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            title="حسابي"
            className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 backdrop-blur-sm transition-all hover:border-emerald-500/40 hover:bg-emerald-500/10 active:scale-95"
          >
            <span className="hidden sm:flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-300 flex-shrink-0">
              <User className="h-4 w-4" />
            </span>
            <span className="hidden sm:flex flex-col text-right">
              <span className="max-w-[140px] truncate text-xs font-semibold text-white/90">
                {userName}
              </span>
              {userEmail && (
                <span className="max-w-[140px] truncate text-[10px] text-white/40">
                  {userEmail}
                </span>
              )}
            </span>
            <ChevronDown className={`h-3.5 w-3.5 text-white/50 transition-transform ${menuOpen ? "rotate-180" : ""}`} />
          </button>

          {menuOpen && (
            <div className="absolute top-[calc(100%+8px)] end-0 z-50 w-52 overflow-hidden rounded-2xl border border-white/10 bg-[#06231a] p-1.5 shadow-2xl shadow-black/60">
              <Link
                href="/settings"
                onClick={() => setMenuOpen(false)}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-semibold text-white/80 transition-colors hover:bg-white/[0.06] hover:text-white"
              >
                <Settings className="h-4 w-4 text-emerald-300" />
                الإعدادات
              </Link>
              <div className="my-1 h-px bg-white/10" />
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/" })}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-semibold text-red-300 transition-colors hover:bg-red-500/10"
              >
                <LogOut className="h-4 w-4" />
                تسجيل الخروج
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
