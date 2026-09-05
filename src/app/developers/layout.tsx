// src/app/developers/layout.tsx
// ── Developer Portal Layout ───────────────────────────────────────────────────
// server component — بيعمل auth check بدون أي dependency على NextAuth

import type { Metadata } from "next";
import { redirect }     from "next/navigation";
import { getDevSession } from "@/lib/dev-auth";
import { DEVELOPERS_BASE_URL } from "@/lib/dev-links";
import { LanguageProvider } from "./_components/LanguageProvider";

export const metadata: Metadata = {
  title: {
    default: "Wani for Developers — واجهة برمجة واتساب OTP API",
    template: "%s | Wani for Developers",
  },
  description:
    "بورتال المطورين من وني: أرسل رسائل واتساب OTP وإشعارات برمجياً عبر WhatsApp Business API. توثيق كامل، أمثلة كود، ودعم فني.",
  alternates: {
    canonical: DEVELOPERS_BASE_URL,
  },
  // فيف أيقون خاصة بقسم المطورين (لوجو التطبيق) بدل فيف أيقون المسوقين
  icons: {
    icon: [{ url: "/landingpage-dev.svg", type: "image/svg+xml" }],
    shortcut: ["/landingpage-dev.svg"],
  },
  openGraph: {
    title: "Wani for Developers — WhatsApp OTP API",
    description:
      "أرسل واتساب OTP وإشعارات من تطبيقك عبر API بسيط وموثوق. ابدأ التكامل في دقائق.",
    url: DEVELOPERS_BASE_URL,
    locale: "ar_EG",
    type: "website",
  },
};

export default async function DeveloperLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // الصفحة دي server component — بنقرأ الـ cookie مباشرة
  // مفيش useSession، مفيش NextAuth هنا
  return <LanguageProvider>{children}</LanguageProvider>;
}

