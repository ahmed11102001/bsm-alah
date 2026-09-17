"use client";

import Image from "next/image";
import { signOut, useSession } from "next-auth/react";
import { LogOut, User, Sparkles, Layers } from "lucide-react";

export default function ChannelsNavbar({ initialUser }: { initialUser?: { name?: string | null; email?: string | null } }) {
  const { data: session } = useSession();
  const userName = session?.user?.name || initialUser?.name || "المستخدم";
  const userEmail = session?.user?.email || initialUser?.email || "";

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
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2.5 rounded-xl border border-white/5 bg-white/[0.03] px-3 py-1.5 backdrop-blur-sm">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-300">
              <User className="h-4 w-4" />
            </div>
            <div className="flex flex-col text-right">
              <span className="max-w-[140px] truncate text-xs font-semibold text-white/90">
                {userName}
              </span>
              {userEmail && (
                <span className="max-w-[140px] truncate text-[10px] text-white/40">
                  {userEmail}
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/" })}
            className="group flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs font-medium text-white/75 transition-all hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-300 active:scale-95"
            title="تسجيل الخروج"
          >
            <LogOut className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
            <span className="hidden xs:inline">خروج</span>
          </button>
        </div>
      </div>
    </header>
  );
}
