import type { Metadata } from "next";
import { notFound } from "next/navigation";
import LandingPage from "@/components/LandingPage";
import type { Lang } from "@/lib/translations";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export function generateStaticParams() {
  return [{ locale: "ar" }, { locale: "en" }];
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;

  if (locale !== "ar" && locale !== "en") {
    return {};
  }

  const isAr = locale === "ar";
  const canonicalUrl = `https://aiwni.com/${locale}`;

  return {
    title: isAr
      ? "Wani — وني | منصة واتساب للأعمال، CRM، أتمتة وحملات تسويقية"
      : "WANI — WhatsApp Business Platform, CRM, Automation & AI Marketing",
    description: isAr
      ? "وني هي منصة واتساب للأعمال (WhatsApp Business) متكاملة تشمل CRM، حملات تسويقية جماعية، أتمتة الردود، مساعد مبيعات بالذكاء الاصطناعي، صندوق وارد موحد للفريق، وربط مباشر مع المتاجر الإلكترونية. ابدأ مجاناً."
      : "Wani is an all-in-one WhatsApp Business platform with CRM, bulk marketing campaigns, automated replies, AI sales assistant, unified team inbox, and e-commerce integrations. Start free.",
    keywords: isAr
      ? [
          "واتساب للأعمال",
          "WhatsApp Business",
          "WhatsApp CRM",
          "واتساب CRM",
          "حملات واتساب",
          "WhatsApp campaigns",
          "أتمتة واتساب",
          "WhatsApp automation",
          "WhatsApp Business API",
          "واتساب شات بوت",
          "WhatsApp chatbot",
          "رسائل واتساب جماعية",
          "WhatsApp marketing",
          "تسويق واتساب",
          "صندوق وارد واتساب",
          "WhatsApp team inbox",
          "وني",
          "Wani",
        ]
      : [
          "WhatsApp Business",
          "WhatsApp CRM",
          "WhatsApp marketing",
          "WhatsApp automation",
          "WhatsApp campaigns",
          "WhatsApp chatbot",
          "WhatsApp Business API",
          "WhatsApp team inbox",
          "AI sales assistant",
          "bulk WhatsApp messages",
          "WANI",
          "Wani",
        ],
    alternates: {
      canonical: canonicalUrl,
      languages: {
        ar: "https://aiwni.com/ar",
        en: "https://aiwni.com/en",
        "x-default": "https://aiwni.com/en",
      },
    },
    openGraph: {
      title: isAr
        ? "Wani — وني | منصة واتساب للأعمال وأتمتة التسويق"
        : "WANI — WhatsApp Business CRM & Marketing Automation",
      description: isAr
        ? "أرسل آلاف الرسائل لعملائك بنقرة واحدة، تابع المحادثات من صندوق وارد موحد، وخلّي الـ AI يبيع عنك ٢٤/٧ على واتساب."
        : "Send bulk WhatsApp campaigns in one click, manage customer conversations from a unified inbox, and let AI sell for you 24/7.",
      url: canonicalUrl,
      siteName: "Wani",
      locale: isAr ? "ar_EG" : "en_US",
      type: "website",
      images: [
        {
          url: "/favicon.jpg",
          width: 1200,
          height: 1200,
          alt: isAr ? "Wani — منصة واتساب للأعمال" : "WANI — WhatsApp Business Platform",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: isAr ? "Wani — وني | منصة واتساب للأعمال" : "WANI — WhatsApp Business CRM",
      description: isAr
        ? "CRM واتساب متكامل: حملات جماعية، أتمتة، AI مبيعات، صندوق وارد للفريق — ابدأ مجاناً."
        : "All-in-one WhatsApp CRM: Bulk campaigns, automations, AI sales assistant, team inbox — start free.",
      images: ["/favicon.jpg"],
    },
  };
}

export default async function LocalizedHomePage({ params }: PageProps) {
  const { locale } = await params;

  if (locale !== "ar" && locale !== "en") {
    notFound();
  }

  return <LandingPage initialLang={locale as Lang} />;
}
