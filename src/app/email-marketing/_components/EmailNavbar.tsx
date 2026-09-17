"use client";

import Link from "next/link";
import Image from "next/image";
import { signOut, useSession } from "next-auth/react";
import { Mail, ArrowRight, User, LogOut, Layers, ExternalLink } from "lucide-react";

export default function EmailNavbar({
  initialUser,
}: {
  initialUser?: { name?: string | null; email?: string | null };
}) {
  const { data: session } = useSession();
  const userName = session?.user?.name || initialUser?.name || "المستخدم";
  const userEmail = session?.user?.email || initialUser?.email || "";

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#041a14]/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left: Brand + Back to Channels */}
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/channels"
            className="group flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-white/70 transition-all hover:border-emerald-500/40 hover:bg-emerald-500/10 hover:text-emerald-300 active:scale-95"
            title="الرجوع لمركز القنوات"
          >
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            <span className="hidden sm:inline">مركز القنوات</span>
          </Link>

          <div className="h-5 w-px bg-white/10 hidden sm:block" />

          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 p-0.5 shadow-lg shadow-blue-500/20">
              <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-[#04241b]">
                <Mail className="h-5 w-5 text-blue-400" />
              </div>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-base font-extrabold tracking-wider text-white">WANI</span>
                <span className="inline-flex items-center gap-1 rounded-full border border-blue-500/30 bg-blue-500/15 px-2 py-0.5 text-[10px] font-bold text-blue-300">
                  Email Marketing
                </span>
              </div>
              <span className="text-[11px] text-white/50">لوحة حملات البريد الإلكتروني</span>
            </div>
          </div>
        </div>

        {/* Right: User + Sign out */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2.5 rounded-xl border border-white/5 bg-white/[0.03] px-3 py-1.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/20 text-blue-300">
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
