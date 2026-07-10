"use client";

import Link from "next/link";
import { useState } from "react";

type Bi = { ar: string; en: string };

const sections: { id: string; title: Bi; content: Bi }[] = [
  {
    id: "intro",
    title: { ar: "مقدمة", en: "Introduction" },
    content: {
      ar: `مرحباً بك في Wani (وني). نحن نأخذ خصوصيتك بجدية تامة. توضح هذه السياسة كيف نجمع ونستخدم ونحمي المعلومات التي تقدمها عند استخدام منصتنا لإدارة حملات واتساب التسويقية عبر WhatsApp Business API.

بالتسجيل في المنصة أو استخدامها، فإنك توافق على الشروط الواردة في هذه السياسة. إذا كنت لا توافق، يُرجى عدم استخدام الخدمة.`,
      en: `Welcome to Wani. We take your privacy seriously. This policy explains how we collect, use, and protect the information you provide when using our platform to manage WhatsApp marketing campaigns through the WhatsApp Business API.

By registering for or using the platform, you agree to the terms in this policy. If you don't agree, please don't use the service.`,
    },
  },
  {
    id: "data-collected",
    title: { ar: "البيانات التي نجمعها", en: "Data We Collect" },
    content: {
      ar: `نجمع الأنواع التالية من البيانات:

**بيانات الحساب:**
— الاسم، البريد الإلكتروني، رقم الهاتف عند التسجيل
— كلمة المرور (مشفّرة بخوارزمية bcrypt — لا نطّلع عليها كنص واضح)
— بيانات الدخول عبر Google (الاسم والبريد فقط، لمن يختار تسجيل الدخول بحساب Google)
— بيانات ربط واتساب: Access Token (مشفّر بـ AES-256-GCM)، Phone Number ID، WABA ID

**بيانات الاستخدام:**
— جهات الاتصال التي ترفعها وأرقام هواتفهم
— محتوى الرسائل والقوالب والردود الآلية التي تنشئها
— محتوى المحادثات مع عملائك عبر واتساب، بما فيها الرسائل الصوتية (تُستخدم لتشغيل ميزات الذكاء الاصطناعي — انظر قسم "الميزات المعتمدة على الذكاء الاصطناعي")
— إحصائيات الحملات: عدد الرسائل المرسلة والمستلَمة والمقروءة
— بيانات المتجر الإلكتروني (Shopify أو EasyOrders) عند ربطه اختيارياً: الطلبات، حالتها، وبيانات العملاء المرتبطة بها
— سجلات النشاط وأوقات الدخول

**بيانات تقنية:**
— عنوان IP ونوع المتصفح عند استخدام المنصة
— سجلات الأخطاء لأغراض تشخيصية فقط`,
      en: `We collect the following types of data:

**Account data:**
— Name, email, and phone number at sign-up
— Password (hashed with bcrypt — we never see it in plain text)
— Google sign-in data (name and email only, for users who choose to sign in with Google)
— WhatsApp connection data: Access Token (encrypted with AES-256-GCM), Phone Number ID, WABA ID

**Usage data:**
— Contacts you upload and their phone numbers
— Content of messages, templates, and automated replies you create
— Content of conversations with your customers on WhatsApp, including voice messages (used to power AI features — see "AI-Powered Features" below)
— Campaign statistics: messages sent, delivered, and read
— E-commerce store data (Shopify or EasyOrders) when you optionally connect one: orders, order status, and associated customer data
— Activity logs and login times

**Technical data:**
— IP address and browser type while using the platform
— Error logs, for diagnostic purposes only`,
    },
  },
  {
    id: "whatsapp-api",
    title: { ar: "استخدام WhatsApp Business API", en: "Use of the WhatsApp Business API" },
    content: {
      ar: `منصتنا تعمل عبر WhatsApp Business API المقدَّمة من Meta. يمكنك ربط رقمك عبر "الربط التلقائي" (Embedded Signup) أو بإدخال بيانات الاعتماد يدوياً. عليك الانتباه لما يلي:

— أنت المسؤول الكامل عن الامتثال لسياسات Meta وشروط WhatsApp Business
— يجب الحصول على موافقة صريحة من عملائك قبل إرسال أي رسائل تسويقية
— لا يجوز استخدام المنصة لإرسال رسائل غير مرغوب فيها (Spam) أو محتوى مخالف لسياسات Meta
— نحن لا نتحكم في قرارات Meta بشأن تعليق أو إيقاف أي حساب واتساب

بيانات الاعتماد (Access Token) التي تُدخلها أو نحصل عليها عبر Embedded Signup تُستخدم فقط لإرسال واستقبال الرسائل نيابةً عنك، وتُخزَّن مشفَّرة في قاعدة بياناتنا ولا تظهر لأي طرف داخل المنصة بعد إدخالها.`,
      en: `Our platform operates through the WhatsApp Business API provided by Meta. You can connect your number via "Automatic Connect" (Embedded Signup) or by entering credentials manually. Please note:

— You are fully responsible for complying with Meta's policies and WhatsApp Business terms
— You must obtain explicit consent from your customers before sending any marketing messages
— The platform must not be used to send spam or content that violates Meta's policies
— We do not control Meta's decisions to suspend or disable any WhatsApp account

The credentials (Access Token) you enter, or that we obtain via Embedded Signup, are used only to send and receive messages on your behalf. They are stored encrypted in our database and are never shown to anyone, including you, once entered.`,
    },
  },
  {
    id: "ai-features",
    title: { ar: "الميزات المعتمدة على الذكاء الاصطناعي", en: "AI-Powered Features" },
    content: {
      ar: `تتيح المنصة ميزات اختيارية تعتمد على الذكاء الاصطناعي لأتمتة الردود على عملائك:

— **الردود النصية الآلية:** إذا فعّلتها، يُرسَل نص محادثاتك إلى مزوّدي الذكاء الاصطناعي (OpenAI أو Google Gemini) لتوليد الردود
— **تفريغ الرسائل الصوتية:** الرسائل الصوتية التي يرسلها عملاؤك تُحوَّل إلى نص عبر خدمة OpenAI Whisper لفهم محتواها والرد عليها
— **الوكيل الصوتي:** إذا فعّلت ميزة المكالمات الصوتية الآلية، تُستخدم خدمة ElevenLabs لإجراء المكالمة والرد بصوت اصطناعي

هذه الميزات **اختيارية بالكامل** ولا تُفعَّل إلا إذا قمت أنت بتفعيلها من إعدادات حسابك. عند التفعيل، يُعالَج محتوى المحادثات ذات الصلة من قِبل هذه الجهات الخارجية فقط لغرض توليد الرد، ولا يُستخدم لتدريب نماذجهم من جانبنا.`,
      en: `The platform offers optional AI-powered features to automate replies to your customers:

— **Automated text replies:** if enabled, the text of your conversations is sent to AI providers (OpenAI or Google Gemini) to generate replies
— **Voice message transcription:** voice messages your customers send are transcribed to text via OpenAI Whisper so their content can be understood and replied to
— **Voice agent:** if you enable automated voice calls, ElevenLabs is used to place the call and reply with a synthetic voice

These features are **entirely optional** and are only activated if you turn them on from your account settings. Once enabled, the relevant conversation content is processed by these third parties solely to generate a reply, and is not used by us to train their models.`,
    },
  },
  {
    id: "data-use",
    title: { ar: "كيف نستخدم بياناتك", en: "How We Use Your Data" },
    content: {
      ar: `نستخدم البيانات للأغراض التالية حصراً:

— تشغيل الخدمة وإرسال الرسائل نيابةً عنك
— تشغيل الميزات المعتمدة على الذكاء الاصطناعي التي تفعّلها بنفسك
— عرض إحصائيات وتقارير الحملات في لوحة التحكم
— إرسال إشعارات بريدية تتعلق بالخدمة (تأكيد الحساب، تنبيهات أمنية، تحديثات مهمة)
— تحسين أداء المنصة وإصلاح الأخطاء
— الامتثال للمتطلبات القانونية عند الضرورة

**لا نستخدم بياناتك لـ:**
— الإعلانات أو التسويق لجهات خارجية
— بيع بياناتك أو مشاركتها تجارياً
— تحليل محتوى رسائلك لأغراض تجارية خارج نطاق تشغيل الميزات التي فعّلتها بنفسك`,
      en: `We use data exclusively for the following purposes:

— Operating the service and sending messages on your behalf
— Running the AI-powered features you choose to enable
— Displaying campaign statistics and reports in your dashboard
— Sending service-related email notifications (account confirmation, security alerts, important updates)
— Improving platform performance and fixing bugs
— Complying with legal requirements when necessary

**We do not use your data to:**
— Advertise or market on behalf of third parties
— Sell your data or share it commercially
— Analyze your message content for commercial purposes beyond running the features you've enabled yourself`,
    },
  },
  {
    id: "data-sharing",
    title: { ar: "مشاركة البيانات مع أطراف ثالثة", en: "Sharing Data with Third Parties" },
    content: {
      ar: `نتعامل مع عدد من مزوّدي الخدمة (Subprocessors) لتشغيل المنصة، ولا نشارك بياناتك مع أي جهة غير مذكورة هنا دون إذنك الصريح، إلا إذا كان ذلك مطلوباً بموجب القانون:

— **Meta / WhatsApp:** لإرسال واستقبال الرسائل عبر WhatsApp Business API
— **Neon / Vercel:** استضافة قاعدة البيانات والتطبيق
— **Cloudinary:** تخزين الوسائط (الصور والملفات الصوتية) المرسَلة عبر واتساب
— **Resend:** إرسال رسائل البريد الإلكتروني التشغيلية (تأكيد الحساب، الإشعارات)
— **OpenAI و Google Gemini:** توليد الردود الآلية وتفريغ الرسائل الصوتية، فقط عند تفعيلك لهذه الميزات
— **ElevenLabs:** تشغيل الوكيل الصوتي، فقط عند تفعيله
— **Shopify / EasyOrders:** عند ربط متجرك اختيارياً، لقراءة الطلبات وإرسال رسائل متعلقة بها

تخضع بيانات كل جهة لسياسة الخصوصية الخاصة بها، وقد يكون بعضها مستضافاً خارج بلدك. نحرص على التعاقد مع جهات ملتزمة بمعايير حماية بيانات معقولة.`,
      en: `We work with a number of service providers (subprocessors) to run the platform. We do not share your data with anyone not listed here without your explicit consent, unless required by law:

— **Meta / WhatsApp:** to send and receive messages via the WhatsApp Business API
— **Neon / Vercel:** hosting for our database and application
— **Cloudinary:** storage for media (images and audio files) sent via WhatsApp
— **Resend:** sending transactional emails (account confirmation, notifications)
— **OpenAI and Google Gemini:** generating automated replies and transcribing voice messages, only when you enable these features
— **ElevenLabs:** running the voice agent, only when enabled
— **Shopify / EasyOrders:** when you optionally connect your store, to read orders and send related messages

Each provider's data handling is governed by its own privacy policy, and some may host data outside your country. We work only with providers that maintain reasonable data-protection standards.`,
    },
  },
  {
    id: "security",
    title: { ar: "أمان البيانات", en: "Data Security" },
    content: {
      ar: `نطبّق إجراءات أمان متعددة لحماية بياناتك:

— تشفير كلمات المرور باستخدام bcrypt
— تشفير بيانات اعتماد واتساب والمتاجر المرتبطة باستخدام AES-256-GCM
— اتصالات HTTPS مشفَّرة لجميع البيانات المنقولة
— قاعدة بيانات محمية بصلاحيات وصول مقيدة
— جلسات دخول (JWT) بصلاحية 30 يوماً، مع إمكانية تسجيل الخروج في أي وقت

رغم جهودنا، لا يوجد نظام آمن 100%. في حال اكتشاف أي اختراق يؤثر على بياناتك، سنخطرك في أقرب وقت ممكن.`,
      en: `We apply multiple security measures to protect your data:

— Passwords hashed with bcrypt
— WhatsApp and connected-store credentials encrypted with AES-256-GCM
— Encrypted HTTPS connections for all data in transit
— A database protected with restricted access permissions
— Login sessions (JWT) valid for 30 days, with the ability to sign out at any time

Despite our efforts, no system is 100% secure. Should we discover a breach affecting your data, we will notify you as soon as possible.`,
    },
  },
  {
    id: "user-rights",
    title: { ar: "حقوقك", en: "Your Rights" },
    content: {
      ar: `لديك الحق في:

— **الاطلاع:** طلب نسخة من بياناتك الشخصية المخزَّنة لدينا
— **التصحيح:** تعديل أي بيانات غير دقيقة من خلال إعدادات حسابك
— **الحذف:** طلب حذف حسابك وجميع بياناتك نهائياً
— **الاعتراض:** رفض استخدام بياناتك لأغراض معينة، مثل إيقاف الميزات المعتمدة على الذكاء الاصطناعي
— **النقل:** الحصول على بياناتك بصيغة قابلة للقراءة

لممارسة أي من هذه الحقوق، تواصل معنا عبر البريد الإلكتروني المذكور أدناه.`,
      en: `You have the right to:

— **Access:** request a copy of the personal data we store about you
— **Correction:** update any inaccurate data through your account settings
— **Deletion:** request permanent deletion of your account and all associated data
— **Objection:** opt out of specific uses of your data, such as disabling AI-powered features
— **Portability:** receive your data in a readable format

To exercise any of these rights, contact us at the email address below.`,
    },
  },
  {
    id: "cookies",
    title: { ar: "ملفات الارتباط (Cookies)", en: "Cookies" },
    content: {
      ar: `نستخدم ملفات ارتباط ضرورية فقط لتشغيل الخدمة:

— **جلسة المستخدم:** للحفاظ على تسجيل دخولك (JWT Token)
— **تفضيلات الواجهة:** مثل اللغة والسمة (فاتح/داكن)

لا نستخدم ملفات ارتباط تتبّعية أو إعلانية.`,
      en: `We use only the cookies necessary to run the service:

— **User session:** to keep you signed in (JWT token)
— **Interface preferences:** such as language and theme (light/dark)

We do not use tracking or advertising cookies.`,
    },
  },
  {
    id: "retention",
    title: { ar: "مدة الاحتفاظ بالبيانات", en: "Data Retention" },
    content: {
      ar: `نحتفظ ببياناتك طالما حسابك نشط. عند إلغاء الحساب:

— تُحذف بيانات الحساب وجهات الاتصال والرسائل خلال 30 يوماً
— قد نحتفظ ببعض السجلات التقنية لمدة تصل إلى 90 يوماً لأغراض أمنية
— قد نحتفظ ببيانات مجهولة المصدر (إحصائيات إجمالية لا تحدد هويتك) لأغراض تحليلية`,
      en: `We retain your data for as long as your account is active. Upon account cancellation:

— Account, contact, and message data is deleted within 30 days
— We may retain some technical logs for up to 90 days for security purposes
— We may retain anonymized data (aggregate statistics that don't identify you) for analytical purposes`,
    },
  },
  {
    id: "children",
    title: { ar: "الأطفال دون 18 سنة", en: "Children Under 18" },
    content: {
      ar: `منصتنا موجَّهة للأعمال التجارية وليست مخصصة للأشخاص دون 18 سنة. إذا علمنا أن شخصاً دون هذا السن قدَّم بياناته، سنحذفها فوراً.`,
      en: `Our platform is directed at businesses and is not intended for individuals under 18. If we learn that someone under this age has provided their data, we will delete it immediately.`,
    },
  },
  {
    id: "changes",
    title: { ar: "تحديثات السياسة", en: "Changes to This Policy" },
    content: {
      ar: `قد نحدّث هذه السياسة من وقت لآخر. في حال إجراء تغييرات جوهرية، سنخطرك عبر البريد الإلكتروني أو إشعار داخل المنصة قبل 7 أيام من سريانها. استمرارك في استخدام الخدمة بعد التحديث يُعدّ موافقة ضمنية عليها.`,
      en: `We may update this policy from time to time. If we make material changes, we'll notify you by email or an in-app notice at least 7 days before they take effect. Continuing to use the service after an update constitutes implicit acceptance of it.`,
    },
  },
  {
    id: "contact",
    title: { ar: "تواصل معنا", en: "Contact Us" },
    content: {
      ar: `إذا كانت لديك أي استفسارات حول سياسة الخصوصية، تواصل معنا:

البريد الإلكتروني: privacy@wani.app
سيتم الرد خلال 72 ساعة من أيام العمل.`,
      en: `If you have any questions about this privacy policy, contact us:

Email: privacy@wani.app
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
          <span className="text-[#25D366] mt-1.5 text-xs">●</span>
          <span>{line.slice(2)}</span>
        </div>
      );
    }
    if (line === "") return <div key={j} className="h-2" />;
    return <p key={j}>{line}</p>;
  });
}

export default function PrivacyContent() {
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span className="text-white/90 text-sm">
              {isAr ? "محدَّثة ومتوافقة مع Meta" : "Up to date and Meta-compliant"}
            </span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-3">
            {isAr ? "سياسة الخصوصية" : "Privacy Policy"}
          </h1>
          <p className="text-white/70 text-sm">
            {isAr ? "آخر تحديث: " : "Last updated: "}
            {new Date().toLocaleDateString(isAr ? "ar-EG" : "en-US", { year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
      </div>

      {/* المحتوى */}
      <div className="max-w-4xl mx-auto px-6 -mt-8 pb-20">
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
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 scroll-mt-6"
            >
              <div className="flex items-start gap-4 mb-5">
                <div className="w-9 h-9 rounded-xl bg-[#f0fdf4] flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-[#25D366] font-bold text-sm">{i + 1}</span>
                </div>
                <h2 className="text-xl font-bold text-gray-900 pt-1">{section.title[locale]}</h2>
              </div>
              <div className={`text-gray-600 leading-relaxed text-[15px] whitespace-pre-line ${isAr ? "pr-13" : "pl-13"}`}>
                {renderBody(section.content[locale])}
              </div>
            </div>
          ))}
        </div>

        {/* فوتر الصفحة */}
        <div className="mt-10 p-6 bg-[#f0fdf4] rounded-2xl border border-[#dcfce7] text-center">
          <p className="text-sm text-gray-600 mb-3">
            {isAr ? "لديك سؤال حول سياسة الخصوصية؟" : "Have a question about this privacy policy?"}
          </p>
          <a
            href="mailto:privacy@wani.app"
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
            <Link href="/" className="hover:text-[#075E54] transition-colors">
              {isAr ? "الصفحة الرئيسية" : "Home"}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
