import type { Metadata } from "next";
import { Cairo, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ClientProvider from "@/components/ClientProvider";

// خط القاهرة هو الأفضل للمشاريع العربية الاحترافية
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

// إعدادات الـ Metadata لحل مشكلة ظهور الرابط كنص وتفعيل المعاينة (Preview)
export const metadata: Metadata = {
  title: {
    default: "WhatsProf - واتس برو",
    template: "%s | WhatsProf",
  },
  description: "المنصة الرائدة لإرسال رسائل واتساب جماعية وحملات تسويقية ذكية وموثوقة.",
  
  // حل مشكلة أيقونة الشبكة الرمادية (تأكد من وجود favicon.ico في مجلد public)
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },

  // إعدادات المعاينة عند مشاركة الرابط على السوشيال ميديا أو واتساب
  openGraph: {
    title: "WhatsProf - واتس برو لإرسال رسائل الواتساب",
    description: "أرسل آلاف الرسائل لعملائك بنقرة واحدة مع تقارير مفصلة وأتمتة كاملة.",
    url: "https://whatsprof.com", // استبدله برابط موقعك الحقيقي
    siteName: "WhatsProf",
    locale: "ar_EG",
    type: "website",
    images: [
      {
        url: "/og-image.png", // تأكد من وضع صورة بهذا الاسم في مجلد public بمقاس 1200x630
        width: 1200,
        height: 630,
        alt: "WhatsProf Dashboard Preview",
      },
    ],
  },
  
  // إعدادات تويتر
  twitter: {
    card: "summary_large_image",
    title: "WhatsProf - واتس برو",
    description: "نظام إرسال رسائل واتساب جماعية احترافي",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html 
      lang="ar" 
      dir="rtl" 
      className={`${cairo.variable} ${geistSans.variable} ${geistMono.variable} scroll-smooth`}
      suppressHydrationWarning // لمنع أخطاء التداخل مع Dark Mode
    >
      <body className="font-cairo antialiased bg-background text-foreground selection:bg-primary/30">
        <ClientProvider>
          {/* تأكد أن ClientProvider يحتوي على ThemeProvider إذا كنت تستخدم Dark Mode */}
          {children}
        </ClientProvider>
      </body>
    </html>
  );
}