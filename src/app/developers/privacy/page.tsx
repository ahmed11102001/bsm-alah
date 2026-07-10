"use client";

import Link from "next/link";
import { useLanguage } from "../_components/LanguageProvider";

type Bi = { ar: string; en: string };

const sections: { id: string; title: Bi; content: Bi }[] = [
  {
    id: "intro",
    title: { ar: "مقدمة", en: "Introduction" },
    content: {
      ar: `مرحباً بك في Wani for Developers (بورتال المطورين). هذه السياسة تحدداً لبورتال المطورين، وتختلف عن سياسة الخصوصية الخاصة بمنصة Wani الرئيسية لإدارة الحملات، لأن طبيعة البيانات المُعالَجة هنا مختلفة: أنت هنا تستخدم API لإرسال رسائل OTP وواتساب برمجياً من تطبيقك الخاص، وليس عبر لوحة تحكم حملات.

باستخدامك لبورتال المطورين أو الـ API الخاص به، فإنك توافق على هذه السياسة.`,
      en: `Welcome to Wani for Developers (the Developer Portal). This policy is specific to the Developer Portal and differs from the privacy policy of the main Wani campaign platform, because the nature of the data processed here is different: here you're using an API to send OTP and WhatsApp messages programmatically from your own application, not through a campaign dashboard.

By using the Developer Portal or its API, you agree to this policy.`,
    },
  },
  {
    id: "roles",
    title: { ar: "الأدوار: أنت المتحكّم، ونحن المعالِج", en: "Roles: you're the controller, we're the processor" },
    content: {
      ar: `من المهم توضيح هذه النقطة بدقة:

— أنت (المطوّر / صاحب المشروع) هو **المتحكّم بالبيانات** (Data Controller) بالنسبة لأرقام هواتف عملائك النهائيين الذين تُرسل لهم رسائل OTP أو واتساب عبر الـ API
— نحن (Wani) نعمل كـ **معالِج بيانات** (Data Processor) بالنسبة لهذه الأرقام — نقوم فقط بتمرير الرسالة عبر WhatsApp Business API نيابةً عنك، ولا نستخدمها لأي غرض آخر
— أنت المسؤول عن الحصول على موافقة عملائك النهائيين، وعن وجود سياسة خصوصية خاصة بك تُخبرهم بذلك

هذه السياسة تغطي بياناتك أنت كمطوّر/صاحب مشروع، وكيفية تعاملنا مع بيانات العملاء النهائيين التي تمر عبر الـ API.`,
      en: `This distinction matters, so let's be precise:

— You (the developer / project owner) are the **Data Controller** for the phone numbers of your own end customers that you send OTP or WhatsApp messages to via the API
— We (Wani) act as a **Data Processor** for those numbers — we only relay the message through the WhatsApp Business API on your behalf, and don't use it for any other purpose
— You are responsible for obtaining your end customers' consent, and for having your own privacy policy that informs them of this

This policy covers your data as a developer/project owner, and how we handle the end-customer data that passes through the API.`,
    },
  },
  {
    id: "data-collected",
    title: { ar: "البيانات التي نجمعها", en: "Data We Collect" },
    content: {
      ar: `**بياناتك كمطوّر/مالك مشروع:**
— الاسم والبريد الإلكتروني وكلمة المرور (مشفّرة بـ bcrypt)
— بيانات المشاريع التي تنشئها (الاسم، الأعضاء، الأدوار: Owner أو Developer)
— مفاتيح API الخاصة بك (تُعرَض مرة واحدة فقط عند الإنشاء، ونحتفظ بنسخة مجزَّأة (hashed) فقط لا يمكننا نحن أنفسنا استرجاعها)
— بيانات ربط واتساب لكل مشروع: Access Token (مشفّر بـ AES-256-GCM)، Phone Number ID، WABA ID، رقم الهاتف الظاهر
— قوالب الـ OTP التي تُعدّها
— سجلات استخدام الـ API: عدد الطلبات، حالات الإرسال (نجاح/فشل)، الطوابع الزمنية

**بيانات تمر عبر الـ API (تخص عملاءك النهائيين):**
— رقم الهاتف المُرسَل إليه، ومحتوى الرسالة/القالب المُستخدَم وقت الإرسال فقط
— نحتفظ بسجل مختصر لهذه الطلبات (للفوترة وتتبّع الأخطاء وحدود الاستخدام)، وليس بغرض تحليل هوية هؤلاء العملاء`,
      en: `**Your data as a developer/project owner:**
— Name, email, and password (hashed with bcrypt)
— Data for the projects you create (name, members, roles: Owner or Developer)
— Your API keys (shown only once at creation; we keep only a hashed copy that we ourselves cannot reverse)
— WhatsApp connection data per project: Access Token (encrypted with AES-256-GCM), Phone Number ID, WABA ID, display phone number
— The OTP templates you configure
— API usage logs: request counts, send status (success/failure), timestamps

**Data that passes through the API (belonging to your end customers):**
— The recipient phone number, and the content of the message/template used, at the moment of sending only
— We keep a brief log of these requests (for billing, error tracking, and usage limits), not to analyze the identity of those customers`,
    },
  },
  {
    id: "how-used",
    title: { ar: "كيف نستخدم البيانات", en: "How We Use the Data" },
    content: {
      ar: `— تشغيل الـ API وإرسال الرسائل نيابةً عن مشروعك عبر WhatsApp Business API
— التحقق من صلاحية مفاتيح الـ API وتطبيق حدود الاستخدام (Rate Limiting)
— عرض إحصائيات الاستخدام في لوحة تحكم مشروعك
— استقبال تحديثات حالة القوالب من Meta عبر الـ Webhook الخاص بالبورتال
— التواصل معك بخصوص حسابك أو مشروعك (تنبيهات أمنية، تحديثات تخص الخدمة)

لا نستخدم بيانات عملائك النهائيين (أرقام الهواتف التي ترسل إليها عبر الـ API) لأي غرض تسويقي أو تحليلي من جانبنا.`,
      en: `— Operating the API and sending messages on behalf of your project via the WhatsApp Business API
— Validating API keys and applying rate limits
— Displaying usage statistics in your project dashboard
— Receiving template status updates from Meta via the portal's webhook
— Contacting you about your account or project (security alerts, service updates)

We do not use your end customers' data (the phone numbers you send to via the API) for any marketing or analytical purpose of our own.`,
    },
  },
  {
    id: "data-sharing",
    title: { ar: "مشاركة البيانات", en: "Data Sharing" },
    content: {
      ar: `— **Meta / WhatsApp:** لإرسال الرسائل عبر WhatsApp Business API نيابةً عن مشروعك
— **Neon / Vercel:** استضافة قاعدة البيانات والتطبيق
— لا نبيع أو نشارك بيانات مشروعك أو بيانات عملائك النهائيين مع أي جهة إعلانية أو تسويقية`,
      en: `— **Meta / WhatsApp:** to send messages via the WhatsApp Business API on behalf of your project
— **Neon / Vercel:** hosting for our database and application
— We do not sell or share your project's data or your end customers' data with any advertising or marketing party`,
    },
  },
  {
    id: "security",
    title: { ar: "الأمان", en: "Security" },
    content: {
      ar: `— كلمات المرور مشفّرة بـ bcrypt، ومفاتيح الـ API مخزَّنة كنسخة مجزَّأة فقط
— Access Token الخاص بكل مشروع مشفَّر بـ AES-256-GCM ولا يظهر في أي استجابة API بعد حفظه
— كل طلب Webhook من Meta يتم التحقق من توقيعه (HMAC-SHA256) قبل قبوله
— حدود استخدام (Rate Limiting) لمنع إساءة الاستخدام أو هجمات القوة العمياء`,
      en: `— Passwords are hashed with bcrypt, and API keys are stored only as a hashed value
— Each project's Access Token is encrypted with AES-256-GCM and is never returned in any API response after being saved
— Every webhook request from Meta is signature-verified (HMAC-SHA256) before being accepted
— Rate limiting is applied to prevent abuse or brute-force attacks`,
    },
  },
  {
    id: "your-obligations",
    title: { ar: "التزاماتك تجاه عملائك النهائيين", en: "Your Obligations to Your End Customers" },
    content: {
      ar: `بما أنك المتحكّم بالبيانات بالنسبة لعملائك النهائيين، فأنت المسؤول عن:

— الحصول على موافقتهم الصريحة قبل إرسال أي رسالة OTP أو واتساب لهم عبر الـ API
— توفير سياسة خصوصية خاصة بمنتجك/تطبيقك تُوضّح لهم استخدامك لهذه الخدمة
— الامتثال الكامل لسياسات Meta وWhatsApp Business بشأن المحتوى وحدود الإرسال
— عدم استخدام الـ API لإرسال رسائل غير مرغوب فيها (Spam) أو محتوى مخالف

نحن غير مسؤولين عن أي مخالفة تحدث من جانبك في هذا الصدد.`,
      en: `Since you're the data controller for your end customers, you are responsible for:

— Obtaining their explicit consent before sending them any OTP or WhatsApp message via the API
— Providing your own product/app privacy policy that discloses your use of this service to them
— Fully complying with Meta and WhatsApp Business policies on content and sending limits
— Not using the API to send spam or non-compliant content

We are not responsible for any violation on your part in this regard.`,
    },
  },
  {
    id: "retention",
    title: { ar: "مدة الاحتفاظ بالبيانات", en: "Data Retention" },
    content: {
      ar: `نحتفظ ببيانات حسابك ومشاريعك طالما الحساب نشط. عند حذف مشروع أو حسابك:

— تُحذف بيانات الاتصال بـ Meta (الـ Access Token) ومفاتيح الـ API فوراً
— تُحذف سجلات الاستخدام التفصيلية خلال 30 يوماً
— قد نحتفظ بسجلات مجمَّعة غير محدِّدة للهوية لأغراض إحصائية داخلية`,
      en: `We retain your account and project data for as long as the account is active. Upon deleting a project or your account:

— Meta connection data (the Access Token) and API keys are deleted immediately
— Detailed usage logs are deleted within 30 days
— We may retain aggregated, non-identifying logs for internal statistical purposes`,
    },
  },
  {
    id: "rights",
    title: { ar: "حقوقك", en: "Your Rights" },
    content: {
      ar: `كصاحب حساب أو مشروع، لديك الحق في الاطلاع على بياناتك وتصحيحها وحذفها، وطلب نسخة منها بصيغة قابلة للقراءة. للتواصل بخصوص أي من هذه الحقوق، راسلنا على البريد أدناه.`,
      en: `As an account or project owner, you have the right to access, correct, and delete your data, and to request a copy of it in a readable format. To exercise any of these rights, contact us at the email below.`,
    },
  },
  {
    id: "changes",
    title: { ar: "تحديثات السياسة", en: "Changes to This Policy" },
    content: {
      ar: `قد نحدّث هذه السياسة من وقت لآخر. سنخطرك بأي تغييرات جوهرية عبر البريد الإلكتروني أو إشعار داخل البورتال قبل 7 أيام من سريانها.`,
      en: `We may update this policy from time to time. We will notify you of any material changes by email or an in-portal notice at least 7 days before they take effect.`,
    },
  },
  {
    id: "contact",
    title: { ar: "تواصل معنا", en: "Contact Us" },
    content: {
      ar: `للاستفسارات المتعلقة ببورتال المطورين أو الـ API:

البريد الإلكتروني: developers@wani.app`,
      en: `For questions about the Developer Portal or the API:

Email: developers@wani.app`,
    },
  },
];

function renderBody(text: string) {
  return text.split("\n").map((line, j) => {
    if (line.startsWith("**") && line.endsWith("**")) {
      return (
        <p key={j} style={{ fontWeight: 600, color: "#fff", marginTop: 16, marginBottom: 4 }}>
          {line.replace(/\*\*/g, "")}
        </p>
      );
    }
    if (line.startsWith("— ")) {
      return (
        <div key={j} style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "2px 0" }}>
          <span style={{ color: "#20d378", marginTop: 6, fontSize: 10, flexShrink: 0 }}>●</span>
          <span>{line.slice(2)}</span>
        </div>
      );
    }
    if (line === "") return <div key={j} style={{ height: 8 }} />;
    return <p key={j}>{line}</p>;
  });
}

export default function DeveloperPrivacyPage() {
  const { language, toggleLanguage, t } = useLanguage();
  const locale: "ar" | "en" = language === "ar" ? "ar" : "en";
  const dir = locale === "ar" ? "rtl" : "ltr";
  const isAr = locale === "ar";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#060810",
        color: "rgba(255,255,255,0.85)",
        fontFamily: "'IBM Plex Sans Arabic', sans-serif",
        direction: dir,
      }}
    >
      <style>{`@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&display=swap');`}</style>

      {/* شريط علوي */}
      <div style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div
          style={{
            maxWidth: 860,
            margin: "0 auto",
            padding: "16px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Link
            href="/developers"
            style={{ display: "flex", alignItems: "center", gap: 8, color: "rgba(255,255,255,0.6)", fontSize: 13, textDecoration: "none" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" style={{ transform: isAr ? "none" : "rotate(180deg)" }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {t("Back to Developer Portal", "الرجوع لبورتال المطورين")}
          </Link>

          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>Wani for Developers</span>
            <button
              onClick={toggleLanguage}
              style={{
                fontSize: 12,
                color: "rgba(255,255,255,0.6)",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: 999,
                padding: "4px 12px",
                background: "none",
                cursor: "pointer",
              }}
            >
              {isAr ? "English" : "العربية"}
            </button>
          </div>
        </div>
      </div>

      {/* الهيدر */}
      <div style={{ padding: "48px 24px 40px", textAlign: "center" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            background: "rgba(32,211,120,0.1)",
            border: "1px solid rgba(32,211,120,0.25)",
            borderRadius: 999,
            padding: "6px 16px",
            marginBottom: 20,
            fontSize: 13,
            color: "#20d378",
          }}
        >
          {t("API & Developer Portal", "الـ API وبورتال المطورين")}
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: "#fff", marginBottom: 10 }}>
          {t("Privacy Policy", "سياسة الخصوصية")}
        </h1>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>
          {isAr ? "آخر تحديث: " : "Last updated: "}
          {new Date().toLocaleDateString(isAr ? "ar-EG" : "en-US", { year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      {/* المحتوى */}
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "0 24px 80px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {sections.map((section, i) => (
            <div
              key={section.id}
              id={section.id}
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 16,
                padding: 28,
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 16 }}>
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    background: "rgba(32,211,120,0.12)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <span style={{ color: "#20d378", fontWeight: 700, fontSize: 13 }}>{i + 1}</span>
                </div>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: "#fff", paddingTop: 3 }}>{section.title[locale]}</h2>
              </div>
              <div style={{ fontSize: 14.5, lineHeight: 1.9, color: "rgba(255,255,255,0.65)", paddingInlineStart: 48 }}>
                {renderBody(section.content[locale])}
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            marginTop: 32,
            padding: 24,
            background: "rgba(32,211,120,0.06)",
            border: "1px solid rgba(32,211,120,0.2)",
            borderRadius: 16,
            textAlign: "center",
          }}
        >
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", marginBottom: 12 }}>
            {t("Have a question about this policy?", "لديك سؤال حول هذه السياسة؟")}
          </p>
          <a
            href="mailto:developers@wani.app"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "#20d378",
              color: "#060810",
              padding: "8px 20px",
              borderRadius: 999,
              fontSize: 14,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            {t("Contact us", "تواصل معنا")}
          </a>
          <div
            style={{
              marginTop: 16,
              paddingTop: 16,
              borderTop: "1px solid rgba(32,211,120,0.15)",
              display: "flex",
              justifyContent: "center",
              gap: 20,
              fontSize: 12,
              color: "rgba(255,255,255,0.4)",
            }}
          >
            <Link href="/developers/terms" style={{ color: "inherit", textDecoration: "none" }}>
              {t("Terms of Use", "شروط الاستخدام")}
            </Link>
            <span>•</span>
            <Link href="/developers" style={{ color: "inherit", textDecoration: "none" }}>
              {t("Developer Portal Home", "الرئيسية")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
