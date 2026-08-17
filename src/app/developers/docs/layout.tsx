import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "توثيق API واتساب OTP — WhatsApp OTP API Documentation",
  description:
    "مرجع كامل لـ Wani WhatsApp OTP API: أمثلة طلبات، أكواد الاستجابة، وأفضل الممارسات لإرسال رسائل واتساب OTP برمجياً من تطبيقك.",
  alternates: {
    canonical: "https://aiwni.com/developers/docs",
  },
  openGraph: {
    title: "Wani API Documentation — توثيق واتساب OTP API",
    description:
      "مرجع كامل لأرسال واتساب OTP برمجياً: endpoints، أكواد الخطأ، وأمثلة كود.",
    url: "https://aiwni.com/developers/docs",
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
      item: "https://aiwni.com/developers",
    },
    {
      "@type": "ListItem",
      position: 3,
      name: "توثيق API",
      item: "https://aiwni.com/developers/docs",
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
