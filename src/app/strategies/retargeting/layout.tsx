import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "الريتاجت — إعادة استهداف العملاء عبر واتساب | Retargeting",
  description:
    "حلّل بيانات صفحة التقارير تلقائيًا (الرسائل، التكلفة، أداء الحملات، والطلبات)، وصنّف عملاءك لعملاء VIP وعملاء غير نشطين، وابعت لكل فئة حملة واتساب مستهدفة بلغتها. وني بتحوّل تقاريرك لاستهداف فعلي من غير إكسيل.",
  keywords: [
    "إعادة استهداف العملاء عبر واتساب",
    "تصنيف وتقسيم عملاء واتساب",
    "قوائم عملاء الـ VIP على واتساب",
    "استعادة العملاء غير النشطين",
    "Win-back Campaigns WhatsApp",
    "تحليل تقارير واتساب",
    "تكلفة حملات واتساب",
    "أداء حملات واتساب",
    "WhatsApp Customer Segmentation",
    "WhatsApp Retargeting",
  ],
  alternates: {
    canonical: "https://aiwni.com/strategies/retargeting",
  },
  openGraph: {
    title: "الريتاجت — إعادة استهداف العملاء عبر واتساب | Wani",
    description:
      "فرز ذكي للعملاء من بيانات التقارير: عملاء الـ VIP (الأكثر تفاعلاً وإنفاقًا) مقابل العملاء غير النشطين، وحملة واتساب مستهدفة (Win-back) لكل فئة — مبنية على تحليل الرسائل والتكلفة وأداء حملاتك.",
    url: "https://aiwni.com/strategies/retargeting",
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
      name: "استراتيجيات التسويق",
      item: "https://aiwni.com/strategies",
    },
    {
      "@type": "ListItem",
      position: 3,
      name: "الريتاجت",
      item: "https://aiwni.com/strategies/retargeting",
    },
  ],
};

export default function RetargetingLayout({
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
