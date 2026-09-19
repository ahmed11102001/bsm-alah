"use client";

import Link from "next/link";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { Mail, ArrowRight, User, Layers, ExternalLink } from "lucide-react";

export default function EmailNavbar({
  initialUser,
}: {
  initialUser?: { name?: string | null; email?: string | null };
}) {
  const { data: session } = useSession();
  const userName = session?.user?.name || initialUser?.name || "المستخدم";
  const userEmail = session?.user?.email || initialUser?.email || "";

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/95 shadow-[0_1px_12px_rgba(15,23,42,0.06)] backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left: Brand + Back to Channels */}
        <div className="flex items-center gap-4">
          <Link
            href="/channels"
            className="group flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-600 transition-all hover:border-red-300 hover:bg-red-50 hover:text-red-600 active:scale-95"
            title="الرجوع لمركز القنوات"
          >
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            <span className="hidden sm:inline">مركز القنوات</span>
          </Link>

          <div className="h-5 w-px bg-slate-200 hidden sm:block" />

          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-red-600 to-rose-500 shadow-lg shadow-red-500/30">
              <Mail className="h-5 w-5 text-white" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-base font-extrabold tracking-wider text-slate-900">WANI</span>
                <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-600">
                  Email Marketing
                </span>
              </div>
              <span className="text-[11px] text-slate-400">لوحة حملات البريد الإلكتروني</span>
            </div>
          </div>
        </div>

        {/* Right: User */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2.5 rounded-2xl border border-slate-200 bg-white px-3 py-1.5 shadow-sm">
            <div className="flex flex-col text-right">
              <span className="max-w-[140px] truncate text-xs font-bold text-slate-900">
                {userName}
              </span>
              {userEmail && (
                <span className="max-w-[140px] truncate text-[10px] text-slate-400">
                  {userEmail}
                </span>
              )}
            </div>
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-red-50 text-red-500">
              <User className="h-4 w-4" />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
