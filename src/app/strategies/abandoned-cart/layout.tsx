import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "استرجاع السلات المتروكة عبر واتساب — Abandoned Cart Recovery",
  description:
    "استرجع السلات المتروكة تلقائياً عبر رسائل واتساب ذكية. وني ترسل تذكيرات فورية للعملاء اللي ما كملوش الطلب — وتحوّلهم لمبيعات فعلية.",
  alternates: {
    canonical: "https://aiwni.com/strategies/abandoned-cart",
  },
  openGraph: {
    title: "استرجاع السلات المتروكة عبر واتساب | Wani",
    description:
      "حوّل السلات المتروكة لمبيعات فعلية من خلال رسائل واتساب تلقائية. ربط مباشر مع Shopify و WooCommerce و EasyOrders.",
    url: "https://aiwni.com/strategies/abandoned-cart",
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
      name: "استرجاع السلات المتروكة",
      item: "https://aiwni.com/strategies/abandoned-cart",
    },
  ],
};

export default function AbandonedCartLayout({
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
