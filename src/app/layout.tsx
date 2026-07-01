import type { Metadata } from "next";
import { Cairo, Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";
import ClientProvider from "@/components/ClientProvider";
import MetaPixel      from "@/components/metapixel";

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

export const metadata: Metadata = {
  title: {
    default: "WhatsPro - واتس برو",
    template: "%s | WhatsPro",
  },
  description: "المنصة الرائدة لإرسال رسائل واتساب جماعية وحملات تسويقية ذكية وموثوقة.",
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    shortcut: ["/favicon.svg"],
    apple: [{ url: "/favicon.jpg", sizes: "1200x1200", type: "image/jpeg" }],
  },
  openGraph: {
    title: "WhatsPro - واتس برو",
    description: "أرسل آلاف الرسائل لعملائك بنقرة واحدة مع تقارير مفصلة وأتمتة كاملة.",
    url: "https://whatsprosystem.vercel.app",
    siteName: "WhatsPro",
    locale: "ar_EG",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "WhatsPro Dashboard Preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "WhatsPro - واتس برو",
    description: "نظام إرسال رسائل واتساب جماعية احترافي",
    images: ["/og-image.png"],
  },
};

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
      </head>
      <body className="font-cairo antialiased bg-background text-foreground selection:bg-primary/30">
        <MetaPixel nonce={nonce} />
        <ClientProvider>
          {children}
        </ClientProvider>
      </body>
    </html>
  );
}