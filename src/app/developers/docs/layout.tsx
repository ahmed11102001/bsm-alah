import type { Metadata } from "next";
import { DEVELOPERS_BASE_URL } from "@/lib/dev-links";

export const metadata: Metadata = {
  title: "توثيق API واتساب OTP — WhatsApp OTP API Documentation",
  description:
    "مرجع كامل لـ Wani WhatsApp OTP API: أمثلة طلبات، أكواد الاستجابة، وأفضل الممارسات لإرسال رسائل واتساب OTP برمجياً من تطبيقك.",
  alternates: {
    canonical: `${DEVELOPERS_BASE_URL}/docs`,
  },
  openGraph: {
    title: "Wani API Documentation — توثيق واتساب OTP API",
    description:
      "مرجع كامل لأرسال واتساب OTP برمجياً: endpoints، أكواد الخطأ، وأمثلة كود.",
    url: `${DEVELOPERS_BASE_URL}/docs`,
    locale: "ar_EG",
    type: "article",
  },
};

// JSON-LD: BreadcrumbList
const breadcrumbLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    {
      "@type": "ListItem",
      position: 1,
      name: "الرئيسية",
      item: "https://aiwni.com",
    },
    {
      "@type": "ListItem",
      position: 2,
      name: "المطورين",
      item: DEVELOPERS_BASE_URL,
    },
    {
      "@type": "ListItem",
      position: 3,
      name: "توثيق API",
      item: `${DEVELOPERS_BASE_URL}/docs`,
    },
  ],
};

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      {children}
    </>
  );
}
