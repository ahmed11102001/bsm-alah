import type { Metadata } from "next";
import { getAppServerSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import EmailTabsNav from "./_components/EmailTabsNav";

export const metadata: Metadata = {
  title: "حملات البريد الإلكتروني | WANI Email Marketing",
  description: "أدر قوالب وحملات البريد الإلكتروني وجهات الاتصال وإعدادات SMTP الخاصة بك.",
};

export default async function EmailMarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAppServerSession();

  if (!session?.user) {
    redirect("/ar?openLogin=1&callbackUrl=/dashboard/email");
  }

  return (
    <div
      className="relative min-h-screen min-h-[100dvh] bg-[#fafbfc] text-slate-900 font-sans selection:bg-red-500/20 selection:text-red-700 overflow-x-hidden flex flex-col"
      dir="rtl"
    >
      {/* Ambient background glows and mesh with warm red accents */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -top-40 left-1/4 h-[500px] w-[500px] rounded-full bg-red-500/[0.04] blur-[130px]" />
        <div className="absolute top-1/2 -right-40 h-[450px] w-[450px] rounded-full bg-rose-500/[0.03] blur-[140px]" />
        <div className="absolute -bottom-40 left-10 h-[400px] w-[400px] rounded-full bg-red-600/[0.025] blur-[120px]" />

        {/* Subtle red-tinted grid */}
        <div
          className="absolute inset-0 opacity-[0.4]"
          style={{
            backgroundImage: `linear-gradient(rgba(239, 68, 68, 0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(239, 68, 68, 0.035) 1px, transparent 1px)`,
            backgroundSize: "44px 44px",
          }}
        />
      </div>

      {/* Navbar: brand + channels merged into tabs row */}
      <EmailTabsNav />

      {/* Content Body */}
      <main className="relative z-10 flex-1 flex flex-col">
        {children}
      </main>
    </div>
  );
}
