"use client";

import Link from "next/link";
import { useState } from "react";

type Bi = { ar: string; en: string };

const sections: { id: string; title: Bi; content: Bi }[] = [
  {
    id: "acceptance",
    title: { ar: "القبول والموافقة", en: "Acceptance & Agreement" },
    content: {
      ar: `بالتسجيل في منصة Wani أو استخدامها بأي شكل، فإنك تقر بأنك قرأت هذه الشروط وفهمتها ووافقت عليها بالكامل.

إذا كنت تستخدم المنصة نيابةً عن شركة أو مؤسسة، فإنك تؤكد أن لديك الصلاحية القانونية للموافقة على هذه الشروط باسمها.

يحق لنا تعديل هذه الشروط في أي وقت. سنخطرك بأي تغييرات جوهرية قبل 7 أيام من سريانها.`,
      en: `By registering for or using the Wani platform in any way, you confirm that you have read, understood, and fully agreed to these terms.

If you are using the platform on behalf of a company or organization, you confirm that you have the legal authority to accept these terms on its behalf.

We may modify these terms at any time. We will notify you of any material changes at least 7 days before they take effect.`,
    },
  },
  {
    id: "service-description",
    title: { ar: "وصف الخدمة", en: "Service Description" },
    content: {
      ar: `Wani منصة SaaS (برمجيات كخدمة) تتيح لك:

— إدارة حملات تسويقية عبر WhatsApp Business API
— إرسال رسائل نصية وقوالب وملفات ميديا بالجملة
— إدارة جهات الاتصال والجماهير المستهدفة
— تتبع إحصائيات الإرسال والتسليم والقراءة
— إدارة المحادثات الفردية مع العملاء

الخدمة تعمل عبر WhatsApp Business API الرسمية المقدمة من Meta. أنت تحتاج إلى حساب Meta Business موثّق وموافق عليه مسبقاً للاستفادة من الخدمة.`,
      en: `Wani is a SaaS (software-as-a-service) platform that lets you:

— Manage marketing campaigns through the WhatsApp Business API
— Send bulk text messages, templates, and media files
— Manage contacts and target audiences
— Track sending, delivery, and read statistics
— Manage one-on-one conversations with customers

The service operates through the official WhatsApp Business API provided by Meta. You need a verified, pre-approved Meta Business account to use the service.`,
    },
  },
  {
    id: "account",
    title: { ar: "الحساب والمسؤولية", en: "Account & Responsibility" },
    content: {
      ar: `**إنشاء الحساب:**
— يجب أن يكون عمرك 18 سنة أو أكثر
— يجب تقديم معلومات دقيقة وحديثة عند التسجيل
— حساب واحد لكل شخص أو كيان تجاري

**مسؤوليتك:**
— أنت مسؤول عن الحفاظ على سرية بيانات تسجيل دخولك
— أي نشاط يتم من خلال حسابك هو مسؤوليتك الكاملة
— يجب إخطارنا فوراً في حال الاشتباه في أي وصول غير مصرح به
— لا يجوز مشاركة الحساب أو بيانات الدخول مع أطراف غير مصرح لها`,
      en: `**Creating an account:**
— You must be 18 years of age or older
— You must provide accurate and current information at sign-up
— One account per person or business entity

**Your responsibility:**
— You are responsible for keeping your login credentials confidential
— Any activity through your account is your full responsibility
— You must notify us immediately if you suspect unauthorized access
— The account or login credentials must not be shared with unauthorized parties`,
    },
  },
  {
    id: "meta-compliance",
    title: { ar: "الامتثال لسياسات Meta وواتساب", en: "Compliance with Meta & WhatsApp Policies" },
    content: {
      ar: `هذا القسم بالغ الأهمية. منصتنا تعمل عبر WhatsApp Business API، وأنت ملزم بالامتثال التام لسياسات Meta:

**ما يجب عليك فعله:**
— الحصول على موافقة صريحة (Opt-in) من كل شخص قبل إرسال رسائل تسويقية له
— توفير آلية واضحة لإلغاء الاشتراك (Opt-out) والالتزام بها فوراً
— استخدام القوالب المعتمدة من Meta فقط لبدء المحادثات
— الالتزام بحدود الإرسال المحددة لتجنب حظر الرقم
— الإفصاح عن هويتك التجارية بوضوح في رسائلك

**ما لا يُسمح به إطلاقاً:**
— إرسال Spam أو رسائل غير مرغوب فيها
— إرسال محتوى مضلل أو مخادع أو احتيالي
— إرسال محتوى يحرّض على الكراهية أو العنف
— التحايل على قواعد Meta أو محاولة اختراقها
— شراء قوائم أرقام هاتفية وإرسال رسائل بدون موافقة

**تبعات المخالفة:**
Meta تحتفظ بحق تعليق أو إيقاف أي رقم مخالف. Wani غير مسؤولة عن أي إيقاف يصدر من Meta نتيجة مخالفتك لسياساتهم.`,
      en: `This section is critically important. Our platform operates through the WhatsApp Business API, and you are required to fully comply with Meta's policies:

**What you must do:**
— Obtain explicit opt-in consent from each person before sending them marketing messages
— Provide a clear opt-out mechanism and honor it immediately
— Use only Meta-approved templates to initiate conversations
— Stay within the applicable sending limits to avoid your number being blocked
— Clearly disclose your business identity in your messages

**What is never allowed:**
— Sending spam or unsolicited messages
— Sending misleading, deceptive, or fraudulent content
— Sending content that incites hatred or violence
— Circumventing or attempting to bypass Meta's rules
— Purchasing phone number lists and messaging them without consent

**Consequences of violations:**
Meta reserves the right to suspend or disable any non-compliant number. Wani is not responsible for any suspension issued by Meta as a result of your violation of their policies.`,
    },
  },
  {
    id: "plans-payments",
    title: { ar: "الخطط والدفع", en: "Plans & Payment" },
    content: {
      ar: `**الخطط المتاحة:**
— خطة مجانية: 100 جهة اتصال، 3 حملات، مستخدم واحد
— خطة Starter: 249 جنيه/شهر — 2,000 جهة اتصال، 50 حملة
— خطة Professional: 599 جنيه/شهر — 15,000 جهة اتصال، حملات غير محدودة
— خطة Enterprise: تسعير مخصص حسب الاحتياج

**شروط الدفع:**
— الاشتراك يُجدَّد تلقائياً كل شهر ما لم يُلغَ قبل موعد التجديد
— لا تُستَرد المبالغ المدفوعة عن الفترات المنقضية
— في حال إلغاء الاشتراك، تظل الخدمة متاحة حتى نهاية الفترة المدفوعة
— نحتفظ بحق تغيير الأسعار مع إخطار مسبق 30 يوماً`,
      en: `**Available plans:**
— Free plan: 100 contacts, 3 campaigns, 1 user
— Starter plan: 249 EGP/month — 2,000 contacts, 50 campaigns
— Professional plan: 599 EGP/month — 15,000 contacts, unlimited campaigns
— Enterprise plan: custom pricing based on your needs

**Payment terms:**
— Subscriptions renew automatically each month unless cancelled before the renewal date
— Amounts paid for elapsed periods are non-refundable
— If you cancel, the service remains available until the end of the paid period
— We reserve the right to change prices with 30 days' advance notice`,
    },
  },
  {
    id: "prohibited",
    title: { ar: "الاستخدامات المحظورة", en: "Prohibited Uses" },
    content: {
      ar: `يُحظر استخدام المنصة في أي مما يلي:

— إرسال رسائل ترويجية بدون موافقة المستلمين
— الاحتيال أو التصيد الإلكتروني أو انتحال الهوية
— نشر محتوى مخالف للقانون المصري أو الدولي
— التشهير أو انتهاك حقوق الملكية الفكرية للغير
— إرسال فيروسات أو برمجيات خبيثة
— محاولة اختراق المنصة أو التلاعب بأنظمتها
— إعادة بيع الخدمة دون إذن كتابي مسبق منا
— استخدام الخدمة لأغراض سياسية أو انتخابية بدون التزام كامل بالقوانين المعمول بها`,
      en: `Using the platform for any of the following is prohibited:

— Sending promotional messages without recipient consent
— Fraud, phishing, or impersonation
— Publishing content that violates Egyptian or international law
— Defamation or infringement of others' intellectual property rights
— Sending viruses or malicious software
— Attempting to breach the platform or tamper with its systems
— Reselling the service without our prior written permission
— Using the service for political or electoral purposes without full compliance with applicable laws`,
    },
  },
  {
    id: "data-ownership",
    title: { ar: "ملكية البيانات", en: "Data Ownership" },
    content: {
      ar: `**بياناتك ملكك:**
— أنت تحتفظ بكامل ملكية بياناتك: جهات الاتصال، الرسائل، القوالب
— نحن نمنحك ترخيصاً محدوداً لاستخدام المنصة لمعالجة بياناتك
— لا ندّعي أي ملكية على المحتوى الذي تنشئه أو ترسله

**ترخيص الاستخدام:**
بالتسجيل في المنصة، تمنحنا ترخيصاً محدوداً لمعالجة بياناتك بالقدر اللازم لتشغيل الخدمة وتحسينها فقط.`,
      en: `**Your data is yours:**
— You retain full ownership of your data: contacts, messages, templates
— We grant you a limited license to use the platform to process your data
— We claim no ownership over content you create or send

**License to us:**
By registering for the platform, you grant us a limited license to process your data only to the extent necessary to operate and improve the service.`,
    },
  },
  {
    id: "service-availability",
    title: { ar: "توفر الخدمة والصيانة", en: "Service Availability & Maintenance" },
    content: {
      ar: `نسعى لتوفير الخدمة بنسبة 99% من الوقت، لكن لا يمكننا ضمان توفر مستمر بدون انقطاع.

**حالات قد تنقطع فيها الخدمة:**
— صيانة دورية مجدولة (سنخطرك مسبقاً)
— أعطال تقنية غير متوقعة
— انقطاعات في خدمة WhatsApp API من جانب Meta
— قوة قاهرة خارجة عن إرادتنا

لا نتحمل مسؤولية الخسائر الناجمة عن انقطاع الخدمة في هذه الحالات.`,
      en: `We aim to keep the service available 99% of the time, but we cannot guarantee uninterrupted availability.

**Situations that may cause interruptions:**
— Scheduled routine maintenance (we'll notify you in advance)
— Unexpected technical failures
— WhatsApp API outages on Meta's side
— Force majeure events beyond our control

We are not liable for losses arising from service interruptions in these situations.`,
    },
  },
  {
    id: "liability",
    title: { ar: "حدود المسؤولية", en: "Limitation of Liability" },
    content: {
      ar: `**نخلي مسؤوليتنا من:**
— أي إيقاف لحسابك على Meta أو WhatsApp نتيجة مخالفتك لسياساتهم
— فقدان عملاء أو صفقات نتيجة عدم وصول رسائلك
— أي أضرار غير مباشرة أو تبعية أو عرضية
— محتوى الرسائل التي ترسلها أنت عبر المنصة
— دقة بيانات الإحصائيات المقدمة من Meta

**الحد الأقصى للتعويض:**
في جميع الأحوال، لا تتجاوز مسؤوليتنا تجاهك مبلغ ما دفعته فعلياً في آخر 3 أشهر.`,
      en: `**We disclaim liability for:**
— Any suspension of your Meta or WhatsApp account resulting from your violation of their policies
— Loss of customers or deals due to messages not being delivered
— Any indirect, consequential, or incidental damages
— The content of messages you send through the platform
— The accuracy of statistics data provided by Meta

**Maximum compensation:**
In all cases, our liability to you will not exceed the amount you actually paid in the last 3 months.`,
    },
  },
  {
    id: "termination",
    title: { ar: "إنهاء الخدمة", en: "Termination" },
    content: {
      ar: `**من جانبك:**
يمكنك إلغاء حسابك في أي وقت من إعدادات الحساب. تظل بياناتك متاحة للتصدير لمدة 30 يوماً بعد الإلغاء.

**من جانبنا:**
نحتفظ بحق تعليق أو إنهاء حسابك فوراً في حال:
— مخالفة جسيمة لهذه الشروط أو سياسات Meta
— الاشتباه في نشاط احتيالي أو ضار
— عدم سداد المستحقات المالية

سنخطرك مسبقاً في حالات الإنهاء العادية، باستثناء المخالفات الجسيمة.`,
      en: `**On your part:**
You can cancel your account at any time from your account settings. Your data remains available for export for 30 days after cancellation.

**On our part:**
We reserve the right to suspend or terminate your account immediately in the event of:
— A serious violation of these terms or Meta's policies
— Suspected fraudulent or harmful activity
— Non-payment of amounts due

We will notify you in advance for ordinary terminations, except in cases of serious violations.`,
    },
  },
  {
    id: "governing-law",
    title: { ar: "القانون المعمول به", en: "Governing Law" },
    content: {
      ar: `تخضع هذه الشروط وتُفسَّر وفقاً لقوانين جمهورية مصر العربية.

في حال نشوء أي نزاع، يكون الاختصاص القضائي لمحاكم القاهرة. نشجع على حل النزاعات ودياً في المقام الأول عبر التواصل المباشر معنا.`,
      en: `These terms are governed by and construed in accordance with the laws of the Arab Republic of Egypt.

Should any dispute arise, the courts of Cairo shall have jurisdiction. We encourage resolving disputes amicably in the first instance by contacting us directly.`,
    },
  },
  {
    id: "contact",
    title: { ar: "تواصل معنا", en: "Contact Us" },
    content: {
      ar: `لأي استفسارات حول هذه الشروط:

البريد الإلكتروني: legal@wani.app
سيتم الرد خلال 72 ساعة من أيام العمل.`,
      en: `For any questions about these terms:

Email: legal@wani.app
We aim to respond within 72 business hours.`,
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

export default function TermsContent() {
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <span className="text-white/90 text-sm">
              {isAr ? "يُرجى القراءة بعناية" : "Please read carefully"}
            </span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-3">
            {isAr ? "شروط الاستخدام" : "Terms of Use"}
          </h1>
          <p className="text-white/70 text-sm">
            {isAr ? "آخر تحديث: " : "Last updated: "}
            {new Date().toLocaleDateString(isAr ? "ar-EG" : "en-US", { year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
      </div>

      {/* المحتوى */}
      <div className="max-w-4xl mx-auto px-6 -mt-8 pb-20">

        {/* تنبيه Meta */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-6 flex gap-4">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-amber-800 text-sm mb-1">
              {isAr ? "تنبيه مهم بشأن سياسات Meta" : "Important notice about Meta policies"}
            </p>
            <p className="text-amber-700 text-sm leading-relaxed">
              {isAr ? (
                <>
                  استخدام هذه المنصة يلزمك بالامتثال الكامل لـ{" "}
                  <a href="https://www.whatsapp.com/legal/business-policy" target="_blank" rel="noopener noreferrer" className="underline font-medium">
                    سياسة WhatsApp Business
                  </a>{" "}
                  و{" "}
                  <a href="https://developers.facebook.com/terms" target="_blank" rel="noopener noreferrer" className="underline font-medium">
                    شروط Meta للمطورين
                  </a>
                  . المخالفة قد تؤدي إلى إيقاف رقمك من Meta.
                </>
              ) : (
                <>
                  Using this platform requires full compliance with the{" "}
                  <a href="https://www.whatsapp.com/legal/business-policy" target="_blank" rel="noopener noreferrer" className="underline font-medium">
                    WhatsApp Business Policy
                  </a>{" "}
                  and{" "}
                  <a href="https://developers.facebook.com/terms" target="_blank" rel="noopener noreferrer" className="underline font-medium">
                    Meta's Developer Terms
                  </a>
                  . Violations may result in Meta disabling your number.
                </>
              )}
            </p>
          </div>
        </div>

        {/* بطاقة الفهرس */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-8">
          <p className="text-xs font-semibold text-[#075E54] uppercase tracking-wider mb-4">
            {isAr ? "المحتويات" : "Contents"}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {sections.map((s, i) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-[#075E54] transition-colors py-1"
              >
                <span className="text-[#25D366] font-mono text-xs w-5">{String(i + 1).padStart(2, "0")}</span>
                {s.title[locale]}
              </a>
            ))}
          </div>
        </div>

        {/* الأقسام */}
        <div className="space-y-6">
          {sections.map((section, i) => (
            <div
              key={section.id}
              id={section.id}
              className={`bg-white rounded-2xl border shadow-sm p-8 scroll-mt-6 ${
                section.id === "meta-compliance"
                  ? "border-amber-200 bg-amber-50/30"
                  : section.id === "prohibited"
                  ? "border-red-100 bg-red-50/20"
                  : "border-gray-100"
              }`}
            >
              <div className="flex items-start gap-4 mb-5">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    section.id === "meta-compliance"
                      ? "bg-amber-100"
                      : section.id === "prohibited"
                      ? "bg-red-100"
                      : "bg-[#f0fdf4]"
                  }`}
                >
                  <span
                    className={`font-bold text-sm ${
                      section.id === "meta-compliance"
                        ? "text-amber-600"
                        : section.id === "prohibited"
                        ? "text-red-500"
                        : "text-[#25D366]"
                    }`}
                  >
                    {i + 1}
                  </span>
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
            {isAr ? "لديك سؤال حول شروط الاستخدام؟" : "Have a question about these terms?"}
          </p>
          <a
            href="mailto:legal@wani.app"
            className="inline-flex items-center gap-2 bg-[#25D366] text-white px-5 py-2 rounded-full text-sm font-medium hover:bg-[#20bb5a] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            {isAr ? "تواصل معنا" : "Contact us"}
          </a>
          <div className="mt-4 pt-4 border-t border-[#dcfce7] flex justify-center gap-6 text-xs text-gray-500">
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
