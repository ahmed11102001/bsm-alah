import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "الريتاجت — إعادة استهداف العملاء عبر واتساب | Retargeting",
  description:
    "حلّل بيانات صفحة التقارير تلقائيًا وافرز عملاءك لكويسين ووحشين، وابعت لكل فئة رسالة واتساب مختلفة تناسبها. وني بتحوّل تقاريرك لاستهداف فعلي من غير إكسيل.",
  alternates: {
    canonical: "https://aiwni.com/strategies/retargeting",
  },
  openGraph: {
    title: "الريتاجت — إعادة استهداف العملاء | Wani",
    description:
      "فرز ذكي للعملاء من بيانات التقارير: الكويسين (الأكثر تفاعلاً وإنفاقًا) والوحشين (الأقل تفاعلاً)، وحملة واتساب مستهدفة لكل فئة.",
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
