import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "استراتيجيات التسويق عبر واتساب — زوّد مبيعاتك مع وني",
  description:
    "اكتشف استراتيجيات تسويق واتساب فعّالة: استرجاع السلات المتروكة، متابعة العملاء، وأتمتة الرسائل لمضاعفة مبيعات متجرك الإلكتروني.",
  alternates: {
    canonical: "https://aiwni.com/strategies",
  },
  openGraph: {
    title: "استراتيجيات التسويق عبر واتساب | Wani",
    description:
      "استراتيجيات عملية لزيادة المبيعات عبر واتساب: استرجاع السلات المتروكة، أتمتة المتابعة، وحملات واتساب ذكية.",
    url: "https://aiwni.com/strategies",
    locale: "ar_EG",
    type: "website",
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
      name: "استراتيجيات التسويق",
      item: "https://aiwni.com/strategies",
    },
  ],
};

export default function StrategiesLayout({
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
