import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "استراتيجية الحملات الذكية عبر واتساب — بث جماعي وشخصنة تلقائية",
    description:
        "استراتيجية الحملات في وني: اختر جمهورك (VIP، متفاعلون، أو مين ما ردش)، اربط قالب واتساب معتمد بمتغيرات شخصية لكل عميل، وابعت حملتك فورًا أو مجدولة — مع تتبع لحظي لمعدل التسليم والقراءة، وحماية تلقائية لرقمك من حظر ميتا.",
    keywords: [
        "استراتيجية الحملات",
        "حملات واتساب جماعية",
        "بث جماعي واتساب",
        "رسائل واتساب جماعية",
        "تقسيم الجمهور تلقائي",
        "شخصنة رسائل واتساب",
        "جدولة حملات واتساب",
        "WhatsApp Bulk Campaigns",
        "WhatsApp Broadcast Marketing",
    ],
    alternates: {
        canonical: "https://aiwni.com/strategies/campaigns",
    },
    openGraph: {
        title: "استراتيجية الحملات الذكية عبر واتساب | Wani",
        description:
            "من جمهور مستهدف بدقة، لقالب معتمد بمتغيرات شخصية، لإرسال محمي من الحظر، لتحليل لحظي لكل رد — استراتيجية الحملات الكاملة في وني.",
        url: "https://aiwni.com/strategies/campaigns",
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
            name: "الحملات الذكية",
            item: "https://aiwni.com/strategies/campaigns",
        },
    ],
};

export default function CampaignsLayout({
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
