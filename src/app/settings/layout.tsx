import type { Metadata } from "next";
import { getAppServerSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { LanguageProvider } from "@/lib/language-context";
import SettingsNavbar from "./_components/SettingsNavbar";

export const metadata: Metadata = {
  title: "الإعدادات | WANI",
  description: "إعدادات حسابك — البيانات الشخصية وكلمة المرور وإدارة الحساب.",
};

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAppServerSession();

  if (!session?.user) {
    redirect("/ar?openLogin=1&callbackUrl=/settings");
  }

  return (
    <LanguageProvider>
      <div className="min-h-screen min-h-[100dvh] bg-gray-50 dark:bg-gray-900 flex flex-col">
        <SettingsNavbar />
        <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 py-6">
          {children}
        </main>
        <footer className="border-t border-gray-200 dark:border-gray-800 py-4 text-center text-xs text-gray-400 dark:text-gray-500">
          <p>© {new Date().getFullYear()} WANI</p>
        </footer>
      </div>
    </LanguageProvider>
  );
}
