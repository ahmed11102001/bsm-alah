import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "تأكيد الطلبات عبر واتساب — Order Confirmation Automation",
    description:
        "أكّد أوردرات متجرك تلقائياً عبر واتساب فور وصولها. وني ترسل رسالة تأكيد بزرارين (تأكيد/إلغاء)، وتسأل عن سبب الإلغاء تلقائيًا، وتنبّهك فورًا بأي أوردر ملغي — من غير أي تدخل يدوي.",
    keywords: [
        "تأكيد الطلبات واتساب",
        "تأكيد الأوردرات تلقائي",
        "رسالة تأكيد الطلب واتساب",
        "تقليل نسبة الرفض عند الاستلام",
        "أتمتة تأكيد الأوردرات",
        "Order Confirmation WhatsApp",
        "تأكيد أوردر شوبيفاي",
        "تأكيد أوردر ووكومرس",
    ],
    alternates: {
        canonical: "https://aiwni.com/strategies/order-confirmation",
    },
    openGraph: {
        title: "تأكيد الطلبات عبر واتساب | Wani",
        description:
            "قلّل نسبة الرفض عند الاستلام (COD) عن طريق تأكيد كل أوردر تلقائيًا عبر واتساب فور وصوله من المتجر. ربط مباشر مع Shopify وWooCommerce وEasyOrders.",
        url: "https://aiwni.com/strategies/order-confirmation",
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
            name: "تأكيد الطلبات",
            item: "https://aiwni.com/strategies/order-confirmation",
        },
    ],
};

export default function OrderConfirmationLayout({
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