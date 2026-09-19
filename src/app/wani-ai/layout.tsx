import type { Metadata } from "next";
import { getAppServerSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { LanguageProvider } from "@/lib/language-context";
import WaniAiNavbar from "./_components/WaniAiNavbar";

export const metadata: Metadata = {
  title: "وني AI | WANI",
  description: "الوكيل الذكي — يرد على عملائك ويقفل البيع لوحده.",
};

export default async function WaniAiLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAppServerSession();

  if (!session?.user) {
    redirect("/ar?openLogin=1&callbackUrl=/wani-ai");
  }

  return (
    <LanguageProvider>
      <div className="min-h-screen min-h-[100dvh] bg-gray-50 dark:bg-gray-900 flex flex-col">
        <WaniAiNavbar />
        <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-6">
          {children}
        </main>
        <footer className="border-t border-gray-200 dark:border-gray-800 py-4 text-center text-xs text-gray-400 dark:text-gray-500">
          <p>© {new Date().getFullYear()} WANI — وني AI</p>
        </footer>
      </div>
    </LanguageProvider>
  );
}
