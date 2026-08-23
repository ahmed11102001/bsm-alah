import type { Metadata } from "next";
import { Cairo, Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";
import ClientProvider from "@/components/ClientProvider";
import MetaPixel from "@/components/metapixel";
import { Analytics } from "@vercel/analytics/next";

const cairo = Cairo({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-cairo",
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// ── SEO: Root Metadata ────────────────────────────────────────────────────────
export const metadata: Metadata = {
  metadataBase: new URL("https://aiwni.com"),
  title: {
    default:
      "Wani — وني | منصة واتساب للأعمال، CRM، أتمتة وحملات تسويقية",
    template: "%s | Wani — وني",
  },
  description:
    "وني هي منصة واتساب للأعمال (WhatsApp Business) متكاملة تشمل CRM، حملات تسويقية جماعية، أتمتة الردود، مساعد مبيعات بالذكاء الاصطناعي، صندوق وارد موحد للفريق، وربط مباشر مع المتاجر الإلكترونية. ابدأ مجاناً.",
  keywords: [
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
  ],
  alternates: {
    canonical: "https://aiwni.com",
  },
  icons: {
    icon: [
      { url: "/wani.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    shortcut: ["/wani.svg"],
    apple: [{ url: "/favicon.jpg", sizes: "1200x1200", type: "image/jpeg" }],
  },
  openGraph: {
    title: "Wani — وني | منصة واتساب للأعمال وأتمتة التسويق",
    description:
      "أرسل آلاف الرسائل لعملائك بنقرة واحدة، تابع المحادثات من صندوق وارد موحد، وخلّي الـ AI يبيع عنك ٢٤/٧ على واتساب.",
    url: "https://aiwni.com",
    siteName: "Wani",
    locale: "ar_EG",
    type: "website",
    images: [
      {
        url: "/favicon.jpg",
        width: 1200,
        height: 1200,
        alt: "Wani — منصة واتساب للأعمال",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Wani — وني | منصة واتساب للأعمال",
    description:
      "CRM واتساب متكامل: حملات جماعية، أتمتة، AI مبيعات، صندوق وارد للفريق — ابدأ مجاناً.",
    images: ["/favicon.jpg"],
  },
  verification: {
    other: {
      "facebook-domain-verification": "at1gad9aug3ozgb44vm97a2wzsjo7m",
    },
  },
};

// ── SEO: JSON-LD Structured Data ──────────────────────────────────────────────
const jsonLd = [
  // Organization — real data only
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Wani",
    alternateName: "وني",
    url: "https://aiwni.com",
    logo: "https://aiwni.com/icon-512.png",
    founder: {
      "@type": "Person",
      name: "أحمد عادل عبد الفتاح إسماعيل",
      alternateName: "Ahmed Adel Abdel Fattah Ismail",
    },
    contactPoint: {
      "@type": "ContactPoint",
      telephone: "+20-1281657907",
      contactType: "customer support",
      email: "support@aiwni.com",
      availableLanguage: ["Arabic", "English"],
    },
    sameAs: [
      "https://www.facebook.com/share/14a5gcBMsdg/",
      "https://www.instagram.com/r0.0_h?igsh=MWJ2NGo3bGlmY2dscQ==",
    ],
  },
  // WebSite — no SearchAction (no public search feature)
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Wani",
    alternateName: "وني",
    url: "https://aiwni.com",
    inLanguage: ["ar", "en"],
  },
  // SoftwareApplication — factual only, no fake ratings/prices/reviews
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Wani",
    alternateName: "وني",
    url: "https://aiwni.com",
    applicationCategory: "BusinessApplication",
    description:
      "منصة واتساب للأعمال متكاملة تشمل CRM، حملات تسويقية، أتمتة الردود، مساعد مبيعات AI، وصندوق وارد موحد للفريق.",
  },
];

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // ── اقرأ الـ nonce اللي الـ middleware ولّده لهذا الـ request ──────────────
  // بنمرره للـ MetaPixel عشان الـ inline script بتاعها تشتغل مع الـ CSP
  const nonce = (await headers()).get("x-nonce") ?? "";

  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${cairo.variable} ${geistSans.variable} ${geistMono.variable} scroll-smooth`}
      suppressHydrationWarning
    >
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#25D366" />
        {/* SEO: JSON-LD Structured Data */}
        {jsonLd.map((schema, i) => (
          <script
            key={i}
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
          />
        ))}
      </head>
      <body className="font-cairo antialiased bg-background text-foreground selection:bg-primary/30">
        <MetaPixel nonce={nonce} />
        <Analytics />
        <ClientProvider>
          {children}
        </ClientProvider>
      </body>
    </html>
  );
}