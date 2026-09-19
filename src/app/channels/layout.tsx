import type { Metadata } from "next";
import { cookies } from "next/headers";
import { getAppServerSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { LanguageProvider } from "@/lib/language-context";
import ChannelsNavbar from "./_components/ChannelsNavbar";

export const metadata: Metadata = {
  title: "قنوات التواصل | WANI Channels",
  description: "اختر القناة لمتابعة وإدارة محادثات وحملات عملائك من منصة واني.",
};

export default async function ChannelsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAppServerSession();

  if (!session?.user) {
    redirect("/ar?openLogin=1&callbackUrl=/dashboard/channels");
  }

  const cookieLocale = (await cookies()).get("NEXT_LOCALE")?.value;
  const dir = cookieLocale === "en" ? "ltr" : "rtl";

  return (
    <LanguageProvider>
    <div className="relative min-h-screen min-h-[100dvh] bg-[#031913] text-foreground font-sans selection:bg-emerald-500/30 selection:text-emerald-200 overflow-x-hidden flex flex-col" dir={dir}>
      {/* Background ambient lighting and grid */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        {/* Ambient gradients */}
        <div className="absolute -top-40 right-1/4 h-[550px] w-[550px] rounded-full bg-emerald-600/15 blur-[120px]" />
        <div className="absolute top-1/3 -left-40 h-[500px] w-[500px] rounded-full bg-teal-500/10 blur-[130px]" />
        <div className="absolute -bottom-40 right-10 h-[450px] w-[450px] rounded-full bg-emerald-700/10 blur-[140px]" />

        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: `linear-gradient(rgba(37, 211, 102, 0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(37, 211, 102, 0.4) 1px, transparent 1px)`,
            backgroundSize: "48px 48px",
          }}
        />
      </div>

      {/* Standalone Navigation Bar */}
      <ChannelsNavbar initialUser={session.user} />

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 flex flex-col">
        {children}
      </main>

      {/* Minimal Footer */}
      <footer className="relative z-10 border-t border-white/5 py-5 text-center text-xs text-white/30">
        <p>© {new Date().getFullYear()} WANI — منصة واتساب للأعمال وقنوات التواصل الذكية</p>
      </footer>
    </div>
    </LanguageProvider>
  );
}
