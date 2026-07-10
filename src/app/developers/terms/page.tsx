"use client";

import Link from "next/link";
import { useLanguage } from "../_components/LanguageProvider";

type Bi = { ar: string; en: string };

const sections: { id: string; title: Bi; content: Bi }[] = [
  {
    id: "acceptance",
    title: { ar: "القبول والموافقة", en: "Acceptance & Agreement" },
    content: {
      ar: `بتسجيلك في بورتال المطورين (Wani for Developers) أو استخدامك للـ API الخاص به بأي شكل، فإنك تقر بأنك قرأت هذه الشروط وفهمتها ووافقت عليها بالكامل، بالإضافة إلى شروط الاستخدام العامة لمنصة Wani حيثما انطبقت.

إذا كنت تستخدم البورتال نيابةً عن شركة، فإنك تؤكد أن لديك الصلاحية القانونية للموافقة على هذه الشروط باسمها.`,
      en: `By registering for the Developer Portal (Wani for Developers) or using its API in any way, you confirm that you have read, understood, and fully agreed to these terms, in addition to Wani's general Terms of Use where applicable.

If you are using the portal on behalf of a company, you confirm that you have the legal authority to accept these terms on its behalf.`,
    },
  },
  {
    id: "service-description",
    title: { ar: "وصف الخدمة", en: "Service Description" },
    content: {
      ar: `بورتال المطورين يتيح لك:

— إنشاء مشاريع وربط كل مشروع برقم WhatsApp Business خاص به
— الحصول على مفاتيح API لإرسال رسائل OTP وواتساب برمجياً من تطبيقك
— إدارة قوالب الرسائل واستقبال تحديثات حالتها من Meta
— دعوة أعضاء آخرين للمشروع بأدوار مختلفة (مالك المشروع أو مطوّر)

الخدمة تعمل عبر WhatsApp Business API الرسمية المقدَّمة من Meta، وتتطلب ربط رقم واتساب صالح لكل مشروع، إما تلقائياً (Embedded Signup) أو يدوياً.`,
      en: `The Developer Portal lets you:

— Create projects and connect each one to its own WhatsApp Business number
— Get API keys to send OTP and WhatsApp messages programmatically from your application
— Manage message templates and receive status updates from Meta
— Invite other members to a project with different roles (project owner or developer)

The service operates through the official WhatsApp Business API provided by Meta, and requires connecting a valid WhatsApp number for each project, either automatically (Embedded Signup) or manually.`,
    },
  },
  {
    id: "account-projects",
    title: { ar: "الحساب والمشاريع", en: "Accounts & Projects" },
    content: {
      ar: `— يجب أن يكون عمرك 18 سنة أو أكثر لإنشاء حساب
— كل مشروع له مالك (Owner) واحد على الأقل، ويمكن إضافة مطوّرين آخرين له
— أنت مسؤول عن دقة البيانات التي تُدخلها وعن إدارة صلاحيات أعضاء مشروعك
— نقل ملكية مشروع لمالك آخر يتم فقط بموافقة صريحة من المالك الحالي عبر آلية النقل المتاحة في البورتال`,
      en: `— You must be 18 years of age or older to create an account
— Every project has at least one Owner, and additional developers can be added to it
— You are responsible for the accuracy of the data you enter and for managing your project members' permissions
— Transferring ownership of a project to another owner happens only with the explicit consent of the current owner, through the transfer mechanism available in the portal`,
    },
  },
  {
    id: "api-keys",
    title: { ar: "مفاتيح الـ API والاستخدام", en: "API Keys & Usage" },
    content: {
      ar: `— يُعرَض مفتاح الـ API لك مرة واحدة فقط عند إنشائه، وأنت وحدك المسؤول عن حفظه بأمان
— لا يجوز مشاركة مفتاح الـ API علناً أو مع أطراف غير موثوقة
— في حال الاشتباه في تسريب مفتاح، يجب عليك إلغاءه فوراً من لوحة التحكم وإصدار مفتاح جديد
— نحتفظ بحق تطبيق حدود استخدام (Rate Limiting) على طلبات الـ API لحماية استقرار الخدمة لجميع المستخدمين
— أي استخدام يتم عبر مفتاحك هو مسؤوليتك الكاملة`,
      en: `— Your API key is shown to you only once at creation, and you alone are responsible for keeping it safe
— The API key must not be shared publicly or with untrusted parties
— If you suspect a key has been leaked, you must revoke it immediately from the dashboard and issue a new one
— We reserve the right to apply rate limits on API requests to protect service stability for all users
— Any use made through your key is entirely your responsibility`,
    },
  },
  {
    id: "meta-compliance",
    title: { ar: "الامتثال لسياسات Meta وواتساب", en: "Compliance with Meta & WhatsApp Policies" },
    content: {
      ar: `هذا القسم بالغ الأهمية، تماماً كما في منصة Wani الرئيسية:

**ما يجب عليك فعله:**
— الحصول على موافقة صريحة (Opt-in) من عملائك النهائيين قبل إرسال رسائل OTP أو واتساب لهم
— استخدام القوالب المعتمدة من Meta فقط
— الالتزام بحدود الإرسال المحددة لكل رقم لتجنب حظره
— الإفصاح بوضوح عن هوية تطبيقك في الرسائل المرسَلة

**ما لا يُسمح به إطلاقاً:**
— إرسال Spam أو رسائل تسويقية بدون موافقة
— إرسال محتوى مضلل أو احتيالي أو محرِّض على الكراهية
— استخدام الـ API لأي غرض يخالف سياسات Meta for Developers

**تبعات المخالفة:**
Meta تحتفظ بحق تعليق أو إيقاف أي رقم أو حساب مطوّرين مخالف. Wani غير مسؤولة عن أي إيقاف يصدر من Meta نتيجة مخالفتك لسياساتهم.`,
      en: `This section is critically important, just as in the main Wani platform:

**What you must do:**
— Obtain explicit opt-in consent from your end customers before sending them OTP or WhatsApp messages
— Use only Meta-approved templates
— Stay within the sending limits set for each number to avoid it being blocked
— Clearly disclose your application's identity in the messages sent

**What is never allowed:**
— Sending spam or marketing messages without consent
— Sending misleading, fraudulent, or hate-inciting content
— Using the API for any purpose that violates Meta for Developers policies

**Consequences of violations:**
Meta reserves the right to suspend or disable any non-compliant number or developer account. Wani is not responsible for any suspension issued by Meta as a result of your violation of their policies.`,
    },
  },
  {
    id: "fees",
    title: { ar: "الرسوم", en: "Fees" },
    content: {
      ar: `أي رسوم مرتبطة باستخدام بورتال المطورين أو الـ API (إن وُجدت) ستُعرَض بوضوح داخل لوحة التحكم قبل تفعيلها، ولن نطبّق أي رسوم جديدة دون إخطارك مسبقاً بما لا يقل عن 30 يوماً.`,
      en: `Any fees associated with using the Developer Portal or the API (if applicable) will be clearly displayed in the dashboard before being activated. We will not apply new fees without giving you at least 30 days' advance notice.`,
    },
  },
  {
    id: "prohibited",
    title: { ar: "الاستخدامات المحظورة", en: "Prohibited Uses" },
    content: {
      ar: `يُحظر استخدام البورتال أو الـ API في أي مما يلي:

— إرسال رسائل بدون موافقة المستلمين
— الاحتيال أو التصيد الإلكتروني أو انتحال الهوية
— نشر محتوى مخالف للقانون المصري أو الدولي
— محاولة اختراق البورتال أو الـ API أو التلاعب بأنظمته
— إعادة بيع الوصول لمفاتيح API الخاصة بك لأطراف أخرى دون إذن كتابي منا`,
      en: `Using the portal or the API for any of the following is prohibited:

— Sending messages without recipient consent
— Fraud, phishing, or impersonation
— Publishing content that violates Egyptian or international law
— Attempting to breach the portal or API or tamper with its systems
— Reselling access to your API keys to other parties without our written permission`,
    },
  },
  {
    id: "availability",
    title: { ar: "توفر الخدمة", en: "Service Availability" },
    content: {
      ar: `نسعى لتوفير خدمة الـ API بشكل مستمر، لكن لا يمكننا ضمان توفر بدون انقطاع، خصوصاً في حال حدوث أعطال من جانب Meta نفسها أو صيانة مجدولة سنُخطرك بها مسبقاً. لا نتحمل مسؤولية الخسائر الناتجة عن انقطاعات خارجة عن إرادتنا.`,
      en: `We strive to keep the API service continuously available, but we cannot guarantee uninterrupted uptime, especially in the event of outages on Meta's side or scheduled maintenance we'll notify you about in advance. We are not liable for losses resulting from interruptions beyond our control.`,
    },
  },
  {
    id: "liability",
    title: { ar: "حدود المسؤولية", en: "Limitation of Liability" },
    content: {
      ar: `— لا نتحمل مسؤولية أي إيقاف لرقمك على Meta نتيجة مخالفتك لسياساتهم
— لا نتحمل مسؤولية أي أضرار غير مباشرة أو تبعية ناتجة عن استخدامك للـ API
— لا نتحمل مسؤولية محتوى الرسائل التي ترسلها عبر الـ API
— في جميع الأحوال، لا تتجاوز مسؤوليتنا تجاهك مبلغ ما دفعته فعلياً (إن وُجد) في آخر 3 أشهر`,
      en: `— We are not liable for any suspension of your number on Meta resulting from your violation of their policies
— We are not liable for any indirect or consequential damages arising from your use of the API
— We are not liable for the content of messages you send through the API
— In all cases, our liability to you will not exceed the amount you actually paid (if any) in the last 3 months`,
    },
  },
  {
    id: "termination",
    title: { ar: "إنهاء الخدمة", en: "Termination" },
    content: {
      ar: `يمكنك حذف مشروعك أو حسابك في أي وقت من لوحة التحكم. نحتفظ بحق تعليق أو إنهاء وصولك للـ API فوراً في حال مخالفة جسيمة لهذه الشروط أو سياسات Meta، أو الاشتباه في نشاط ضار.`,
      en: `You can delete your project or account at any time from the dashboard. We reserve the right to suspend or terminate your API access immediately in the event of a serious violation of these terms or Meta's policies, or suspected harmful activity.`,
    },
  },
  {
    id: "governing-law",
    title: { ar: "القانون المعمول به", en: "Governing Law" },
    content: {
      ar: `تخضع هذه الشروط لقوانين جمهورية مصر العربية، ويكون الاختصاص القضائي لمحاكم القاهرة عند نشوء أي نزاع.`,
      en: `These terms are governed by the laws of the Arab Republic of Egypt, and the courts of Cairo shall have jurisdiction should any dispute arise.`,
    },
  },
  {
    id: "contact",
    title: { ar: "تواصل معنا", en: "Contact Us" },
    content: {
      ar: `لأي استفسارات حول هذه الشروط أو الـ API:

البريد الإلكتروني: developers@wani.app`,
      en: `For any questions about these terms or the API:

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

export default function DeveloperTermsPage() {
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
            background: "rgba(245,158,11,0.1)",
            border: "1px solid rgba(245,158,11,0.3)",
            borderRadius: 999,
            padding: "6px 16px",
            marginBottom: 20,
            fontSize: 13,
            color: "#f59e0b",
          }}
        >
          {t("Please read carefully", "يُرجى القراءة بعناية")}
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: "#fff", marginBottom: 10 }}>
          {t("Terms of Use", "شروط الاستخدام")}
        </h1>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>
          {isAr ? "آخر تحديث: " : "Last updated: "}
          {new Date().toLocaleDateString(isAr ? "ar-EG" : "en-US", { year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      {/* المحتوى */}
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "0 24px 80px" }}>
        {/* تنبيه Meta */}
        <div
          style={{
            background: "rgba(245,158,11,0.08)",
            border: "1px solid rgba(245,158,11,0.25)",
            borderRadius: 16,
            padding: 20,
            marginBottom: 24,
            display: "flex",
            gap: 14,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "rgba(245,158,11,0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <p style={{ fontWeight: 600, color: "#f59e0b", fontSize: 14, marginBottom: 4 }}>
              {t("Important notice about Meta policies", "تنبيه مهم بشأن سياسات Meta")}
            </p>
            <p style={{ fontSize: 13.5, lineHeight: 1.8, color: "rgba(245,190,80,0.85)" }}>
              {isAr ? (
                <>
                  استخدام هذا الـ API يلزمك بالامتثال الكامل لـ{" "}
                  <a href="https://www.whatsapp.com/legal/business-policy" target="_blank" rel="noopener noreferrer" style={{ textDecoration: "underline" }}>
                    سياسة WhatsApp Business
                  </a>{" "}
                  و{" "}
                  <a href="https://developers.facebook.com/terms" target="_blank" rel="noopener noreferrer" style={{ textDecoration: "underline" }}>
                    شروط Meta للمطورين
                  </a>
                  . المخالفة قد تؤدي إلى إيقاف رقمك من Meta.
                </>
              ) : (
                <>
                  Using this API requires full compliance with the{" "}
                  <a href="https://www.whatsapp.com/legal/business-policy" target="_blank" rel="noopener noreferrer" style={{ textDecoration: "underline" }}>
                    WhatsApp Business Policy
                  </a>{" "}
                  and{" "}
                  <a href="https://developers.facebook.com/terms" target="_blank" rel="noopener noreferrer" style={{ textDecoration: "underline" }}>
                    Meta's Developer Terms
                  </a>
                  . Violations may result in Meta disabling your number.
                </>
              )}
            </p>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {sections.map((section, i) => (
            <div
              key={section.id}
              id={section.id}
              style={{
                background:
                  section.id === "meta-compliance"
                    ? "rgba(245,158,11,0.05)"
                    : section.id === "prohibited"
                    ? "rgba(239,68,68,0.05)"
                    : "rgba(255,255,255,0.03)",
                border:
                  section.id === "meta-compliance"
                    ? "1px solid rgba(245,158,11,0.2)"
                    : section.id === "prohibited"
                    ? "1px solid rgba(239,68,68,0.18)"
                    : "1px solid rgba(255,255,255,0.08)",
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
                    background:
                      section.id === "meta-compliance"
                        ? "rgba(245,158,11,0.15)"
                        : section.id === "prohibited"
                        ? "rgba(239,68,68,0.15)"
                        : "rgba(32,211,120,0.12)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <span
                    style={{
                      fontWeight: 700,
                      fontSize: 13,
                      color:
                        section.id === "meta-compliance"
                          ? "#f59e0b"
                          : section.id === "prohibited"
                          ? "#ef4444"
                          : "#20d378",
                    }}
                  >
                    {i + 1}
                  </span>
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
            {t("Have a question about these terms?", "لديك سؤال حول شروط الاستخدام؟")}
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
            <Link href="/developers/privacy" style={{ color: "inherit", textDecoration: "none" }}>
              {t("Privacy Policy", "سياسة الخصوصية")}
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
