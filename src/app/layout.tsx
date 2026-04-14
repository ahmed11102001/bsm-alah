import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ClientProvider from "@/components/ClientProvider"; // 👈 استيراد الملف اللي عملناه

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "WhatsProf - واتس برو",
  description: "نظام إرسال رسائل واتساب جماعية احترافي",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ar"
      dir="rtl" // 👈 خليه RTL عشان مشروعك بالعربي
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* 👈 تغليف التطبيق بالـ Provider */}
        <ClientProvider>
          {children}
        </ClientProvider>
      </body>
    </html>
  );
}