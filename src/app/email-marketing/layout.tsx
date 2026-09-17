import type { Metadata } from "next";
import { getAppServerSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import EmailNavbar from "./_components/EmailNavbar";
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
      className="relative min-h-screen min-h-[100dvh] bg-[#02140e] text-foreground font-sans selection:bg-blue-500/30 selection:text-blue-200 overflow-x-hidden flex flex-col"
      dir="rtl"
    >
      {/* Ambient background glows and mesh */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -top-40 left-1/4 h-[500px] w-[500px] rounded-full bg-blue-600/10 blur-[130px]" />
        <div className="absolute top-1/2 -right-40 h-[450px] w-[450px] rounded-full bg-indigo-600/10 blur-[140px]" />
        <div className="absolute -bottom-40 left-10 h-[400px] w-[400px] rounded-full bg-emerald-600/10 blur-[120px]" />

        {/* Subtle grid */}
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage: `linear-gradient(rgba(59, 130, 246, 0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(59, 130, 246, 0.4) 1px, transparent 1px)`,
            backgroundSize: "44px 44px",
          }}
        />
      </div>

      {/* Top Navbar */}
      <EmailNavbar initialUser={session.user} />

      {/* Sub-header with Tabs */}
      <EmailTabsNav />

      {/* Content Body */}
      <main className="relative z-10 flex-1 flex flex-col">
        {children}
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 py-5 text-center text-xs text-white/30">
        <p>© {new Date().getFullYear()} WANI — منصة التسويق عبر البريد الإلكتروني والقنوات الذكية</p>
      </footer>
    </div>
  );
}
