import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "استراتيجية محادثات ما بعد الحملة — صندوق فريق موحّد وبوت رد فوري",
    description:
        "استراتيجية المحادثات في وني: كل رد على حملتك بيوصل لصندوق موحّد، بوت الكلمات بيرد فورًا، ولو المحادثة محتاجة إنسان بتتحول لحظة بلحظة لعضو فريق مُعيَّن. تحكم كامل في أدوار الفريق (مدير / موظف محادثات) وتتبع لحظي لمعدل الرد ووقت التحويل.",
    keywords: [
        "استراتيجية المحادثات",
        "صندوق محادثات موحّد واتساب",
        "بوت رد تلقائي واتساب",
        "تعيين محادثات لفريق العمل",
        "إدارة فريق واتساب",
        "تحويل المحادثة لموظف",
        "WhatsApp Team Inbox",
        "WhatsApp Conversation Assignment",
    ],
    alternates: {
        canonical: "https://aiwni.com/strategies/customer-conversations",
    },
    openGraph: {
        title: "استراتيجية محادثات ما بعد الحملة | Wani",
        description:
            "من رد بوت فوري، لتحويل ذكي لإنسان، لتعيين واضح لعضو فريق — استراتيجية إدارة محادثات العملاء الكاملة في وني.",
        url: "https://aiwni.com/strategies/customer-conversations",
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
            name: "محادثات ما بعد الحملة",
            item: "https://aiwni.com/strategies/customer-conversations",
        },
    ],
};

export default function CustomerConversationsLayout({
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
