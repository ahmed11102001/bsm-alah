import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "استراتيجيات التسويق عبر واتساب — الحملات، الذكاء الاصطناعي، وإعادة استهداف العملاء | وني",
  description:
    "اكتشف استراتيجيات تسويق واتساب فعّالة: استراتيجية الحملات لبث جماعي مستهدف وشخصنة تلقائية، استراتيجية الذكاء الاصطناعي لوكيل يرد على عملائك 24 ساعة، استرجاع السلات المتروكة، تأكيد الطلبات تلقائيًا وتقليل نسبة الرفض عند الاستلام، متابعة العملاء لمضاعفة مبيعات متجرك الإلكتروني، وتصنيف عملائك (VIP مقابل غير نشطين) لإعادة استهدافهم عبر واتساب اعتمادًا على بيانات تقاريرك.",
  keywords: [
    "استراتيجيات تسويق واتساب",
    "استراتيجية الحملات",
    "استراتيجية الذكاء الاصطناعي",
    "حملات واتساب جماعية",
    "وكيل ذكاء اصطناعي واتساب",
    "استرجاع السلة المتروكة",
    "تأكيد الطلبات عبر واتساب",
    "تأكيد الأوردرات تلقائي",
    "تقليل نسبة الرفض عند الاستلام",
    "أتمتة واتساب للمتاجر الإلكترونية",
    "متابعة العملاء تلقائيًا",
    "صندوق محادثات موحّد",
    "تعيين محادثات لفريق العمل",
    "إعادة استهداف العملاء عبر واتساب",
    "تصنيف وتقسيم عملاء واتساب",
    "قوائم عملاء الـ VIP على واتساب",
    "استعادة العملاء غير النشطين",
    "Win-back Campaigns",
    "تحليل تقارير واتساب",
    "WhatsApp Marketing Automation",
    "Order Confirmation Automation",
    "WhatsApp Team Inbox",
    "WhatsApp Customer Segmentation",
  ],
  alternates: {
    canonical: "https://aiwni.com/strategies",
  },
  openGraph: {
    title: "استراتيجيات التسويق عبر واتساب — الحملات، الذكاء الاصطناعي، وإعادة استهداف العملاء | Wani",
    description:
      "استراتيجيات عملية لزيادة المبيعات عبر واتساب: استراتيجية الحملات الذكية، استراتيجية الذكاء الاصطناعي، استرجاع السلات المتروكة، تأكيد الطلبات وتقليل الرفض عند الاستلام، أتمتة المتابعة، وتصنيف العملاء (VIP وغير نشطين) لإعادة الاستهداف اعتمادًا على تقاريرك.",
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