"use client";

import Link from "next/link";
import { useState } from "react";

type Bi = { ar: string; en: string };

const sections: { id: string; title: Bi; content: Bi }[] = [
  {
    id: "ownership",
    title: { ar: "من نحن والبيانات القانونية", en: "About Us & Legal Ownership" },
    content: {
      ar: `منصة ومنتج Wani (وني) هي منصة برمجيات كخدمة (SaaS) متخصصة في حلول واتساب للأعمال (WhatsApp Business Platform).

Wani مملوكة ومدارة بالكامل بواسطة:
**أحمد عادل عبد الفتاح إسماعيل**

نقدم من خلال المنصة حلول إدارة علاقات العملاء (CRM)، أتمتة الردود والمتابعة، مساعد المبيعات بالذكاء الاصطناعي، وإدارة الحملات التسويقية المعتمدة من Meta لمساعدة أصحاب الأعمال والمتاجر الإلكترونية على مضاعفة مبيعاتهم وتطوير خدمة العملاء.`,
      en: `Wani is a Software-as-a-Service (SaaS) platform specializing in WhatsApp Business solutions.

Wani is owned and operated by:
**Ahmed Adel Abdel Fattah Ismail**

Through our platform, we provide WhatsApp CRM, automated customer follow-ups, AI sales assistance, and Meta-approved marketing campaign management to help businesses and e-commerce stores grow sales and streamline communication.`,
    },
  },
  {
    id: "mission",
    title: { ar: "رؤيتنا ورسالتنا", en: "Our Vision & Mission" },
    content: {
      ar: `**رؤيتنا:**
أن نكون المنصة الرائدة في العالم العربي لتمكين الأنشطة التجارية والمتاجر الإلكترونية من تحويل محادثات واتساب إلى قناة مبيعات ونمو مستدامة.

**رسالتنا:**
توفير أدوات تقنية متقدمة وسهلة الاستخدام تعتمد على واجهات WhatsApp Business API الرسمية، تضمن أعلى معدلات التسليم، الأمان التام، والامتثال لسياسات Meta.`,
      en: `**Our Vision:**
To be the leading platform empowering businesses and e-commerce stores to transform WhatsApp conversations into a sustainable growth and sales channel.

**Our Mission:**
Delivering advanced, intuitive tools built on official WhatsApp Business APIs that ensure maximum delivery rates, enterprise security, and full Meta policy compliance.`,
    },
  },
  {
    id: "compliance",
    title: { ar: "الأمان والامتثال لسياسات Meta", en: "Security & Meta Compliance" },
    content: {
      ar: `— نعمل حصرياً عبر واجهات WhatsApp Business API الرسمية المعتمدة من Meta
— نطبّق أحدث معايير التشفير (AES-256 و TLS 1.3) لحماية بيانات المستخدمين والعملاء
— نلتزم التزاماً كاملاً بسياسات الخصوصية وشروط الاستخدام المعمول بها دولياً ومحلياً
— لا نشارك أو نبيع بيانات العملاء لأي طرف ثالث`,
      en: `— We operate exclusively via official Meta-approved WhatsApp Business APIs
— We apply robust encryption standards (AES-256 and TLS 1.3) to safeguard user and customer data
— We maintain full compliance with international and local privacy and acceptable use standards
— We never sell or share customer data with third parties`,
    },
  },
  {
    id: "contact",
    title: { ar: "بيانات التواصل والإدارة", en: "Contact & Management" },
    content: {
      ar: `المالك والمشغل: أحمد عادل عبد الفتاح إسماعيل
البريد الإلكتروني: support@aiwni.com
الهاتف: 201281657907+
الموقع: الإسكندرية، جمهورية مصر العربية

نحن متاحون للرد على كافة الاستفسارات والدعم الفني طوال أيام الأسبوع.`,
      en: `Owner & Operator: Ahmed Adel Abdel Fattah Ismail
Email: support@aiwni.com
Phone: +20 1281657907
Location: Alexandria, Arab Republic of Egypt

We are available to answer all inquiries and provide technical support throughout the week.`,
    },
  },
];

function renderBody(text: string) {
  return text.split("\n").map((line, j) => {
    if (line.startsWith("**") && line.endsWith("**")) {
      return (
        <p key={j} className="font-semibold text-gray-800 mt-4 mb-1">
          {line.replace(/\*\*/g, "")}
        </p>
      );
    }
    if (line.startsWith("— ")) {
      return (
        <div key={j} className="flex items-start gap-2 py-0.5">
          <span className="text-[#25D366] mt-1.5 text-xs flex-shrink-0">●</span>
          <span>{line.slice(2)}</span>
        </div>
      );
    }
    if (line === "") return <div key={j} className="h-2" />;
    return <p key={j}>{line}</p>;
  });
}

export default function AboutContent() {
  const [locale, setLocale] = useState<"ar" | "en">("ar");
  const dir = locale === "ar" ? "rtl" : "ltr";
  const isAr = locale === "ar";

  return (
    <div className="min-h-screen bg-white" dir={dir}>
      {/* شريط علوي */}
      <div className="bg-[#075E54]">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-white/80 hover:text-white transition-colors text-sm">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              style={{ transform: isAr ? "none" : "rotate(180deg)" }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {isAr ? "الرجوع للرئيسية" : "Back to home"}
          </Link>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#25D366] flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
              </div>
              <span className="text-white font-bold text-sm">Wani</span>
            </div>

            <button
              onClick={() => setLocale(isAr ? "en" : "ar")}
              className="text-xs text-white/80 hover:text-white border border-white/25 hover:border-white/50 rounded-full px-3 py-1 transition-colors"
            >
              {isAr ? "English" : "العربية"}
            </button>
          </div>
        </div>
      </div>

      {/* الهيدر */}
      <div className="bg-gradient-to-b from-[#075E54] to-[#0d7a6e] pb-16 pt-12">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 mb-6">
            <svg className="w-4 h-4 text-[#25D366]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-white/90 text-sm">
              {isAr ? "منصة واتساب للأعمال الرسمية" : "Official WhatsApp Business Platform"}
            </span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-3">
            {isAr ? "عن منصة Wani" : "About Wani"}
          </h1>
          <p className="text-white/80 text-sm max-w-xl mx-auto">
            {isAr
              ? "Wani مملوكة ومدارة بواسطة أحمد عادل عبد الفتاح إسماعيل — المنصة الرائدة لحلول واتساب للأعمال و CRM الأتمتة."
              : "Wani is owned and operated by Ahmed Adel Abdel Fattah Ismail — The leading platform for WhatsApp Business CRM and automation."}
          </p>
        </div>
      </div>

      {/* المحتوى */}
      <div className="max-w-4xl mx-auto px-6 -mt-8 pb-20">
        <div className="space-y-6">
          {sections.map((section, i) => (
            <div
              key={section.id}
              id={section.id}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 scroll-mt-6"
            >
              <div className="flex items-start gap-4 mb-5">
                <div className="w-9 h-9 rounded-xl bg-[#f0fdf4] flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-[#25D366] font-bold text-sm">{i + 1}</span>
                </div>
                <h2 className="text-xl font-bold text-gray-900 pt-1">{section.title[locale]}</h2>
              </div>
              <div className={`text-gray-600 leading-relaxed text-[15px] ${isAr ? "pr-13" : "pl-13"}`}>
                {renderBody(section.content[locale])}
              </div>
            </div>
          ))}
        </div>

        {/* فوتر الصفحة */}
        <div className="mt-10 p-6 bg-[#f0fdf4] rounded-2xl border border-[#dcfce7] text-center">
          <p className="text-sm text-gray-600 mb-3">
            {isAr ? "لديك أي استفسار أو ترغب في بدء استخدام Wani؟" : "Have questions or ready to get started with Wani?"}
          </p>
          <a
            href="mailto:support@aiwni.com"
            className="inline-flex items-center gap-2 bg-[#25D366] text-white px-5 py-2 rounded-full text-sm font-medium hover:bg-[#20bb5a] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            {isAr ? "تواصل معنا" : "Contact us"}
          </a>
          <div className="mt-4 pt-4 border-t border-[#dcfce7] flex justify-center gap-6 text-xs text-gray-500">
            <Link href="/terms" className="hover:text-[#075E54] transition-colors">
              {isAr ? "شروط الاستخدام" : "Terms of Use"}
            </Link>
            <span>•</span>
            <Link href="/privacy" className="hover:text-[#075E54] transition-colors">
              {isAr ? "سياسة الخصوصية" : "Privacy Policy"}
            </Link>
            <span>•</span>
            <Link href="/" className="hover:text-[#075E54] transition-colors">
              {isAr ? "الصفحة الرئيسية" : "Home"}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
