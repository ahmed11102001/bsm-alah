import Link from "next/link";

export const metadata = {
  title: "سياسة الخصوصية | واتس برو",
  description: "سياسة الخصوصية لمنصة واتس برو لإدارة حملات واتساب التسويقية",
};

const sections = [
  {
    id: "intro",
    title: "مقدمة",
    content: `مرحباً بك في واتس برو. نحن نأخذ خصوصيتك بجدية تامة. توضح هذه السياسة كيفية جمعنا واستخدامنا وحمايتنا للمعلومات التي تقدمها عند استخدام منصتنا لإدارة حملات واتساب التسويقية عبر WhatsApp Business API.

بالتسجيل في المنصة أو استخدامها، فإنك توافق على الشروط الواردة في هذه السياسة. إذا كنت لا توافق، يُرجى عدم استخدام الخدمة.`,
  },
  {
    id: "data-collected",
    title: "البيانات التي نجمعها",
    content: `نجمع الأنواع التالية من البيانات:

**بيانات الحساب:**
— الاسم، البريد الإلكتروني، رقم الهاتف عند التسجيل
— كلمة المرور (مشفرة ببروتوكول bcrypt — لا نطلع عليها)
— بيانات ربط واتساب: Access Token، Phone Number ID، WABA ID

**بيانات الاستخدام:**
— جهات الاتصال التي ترفعها وأرقام هواتفهم
— محتوى الرسائل والقوالب التي تنشئها
— إحصائيات الحملات: عدد الرسائل المرسلة، المستلَمة، المقروءة
— سجلات النشاط وأوقات الدخول

**بيانات تقنية:**
— عنوان IP ونوع المتصفح عند استخدام المنصة
— سجلات أخطاء الإرسال لأغراض تشخيصية فقط`,
  },
  {
    id: "whatsapp-api",
    title: "استخدام WhatsApp Business API",
    content: `منصتنا تعمل عبر WhatsApp Business API المقدمة من Meta. عليك الانتباه لما يلي:

— أنت المسؤول الكامل عن الامتثال لسياسات Meta وشروط WhatsApp Business
— يجب الحصول على موافقة صريحة من العملاء قبل إرسال أي رسائل تسويقية
— لا يجوز استخدام المنصة لإرسال Spam أو محتوى مخالف لسياسات Meta
— نحن لا نتحكم في قرارات Meta بشأن تعليق أو إيقاف أي حساب

بيانات الاعتماد (Access Token) التي تدخلها تُستخدم فقط لإرسال الرسائل نيابةً عنك وتُخزَّن مشفرة في قاعدة بياناتنا.`,
  },
  {
    id: "data-use",
    title: "كيف نستخدم بياناتك",
    content: `نستخدم البيانات للأغراض التالية حصراً:

— تشغيل الخدمة وإرسال الرسائل نيابةً عنك
— عرض إحصائيات وتقارير الحملات في لوحة التحكم
— إرسال إشعارات تتعلق بالخدمة (أخطاء، تحديثات مهمة)
— تحسين أداء المنصة وإصلاح الأخطاء
— الامتثال للمتطلبات القانونية عند الضرورة

**لا نستخدم بياناتك لـ:**
— الإعلانات أو التسويق لجهات خارجية
— بيع بياناتك أو مشاركتها تجارياً
— تحليل محتوى رسائلك لأغراض تجارية`,
  },
  {
    id: "data-sharing",
    title: "مشاركة البيانات مع الأطراف الثالثة",
    content: `نشارك بياناتك مع الأطراف الثالثة التالية فقط:

**Meta / WhatsApp:** لإرسال الرسائل عبر WhatsApp Business API. تخضع هذه البيانات لسياسة خصوصية Meta.

**Neon / Vercel:** نستضيف قاعدة البيانات والتطبيق على هذه المنصات. ملتزمون بعقود معالجة بيانات معها.

**لا نشارك** بياناتك مع أي طرف ثالث آخر دون إذنك الصريح، إلا إذا كان ذلك مطلوباً بموجب القانون أو حكم قضائي.`,
  },
  {
    id: "security",
    title: "أمان البيانات",
    content: `نطبق إجراءات أمان متعددة لحماية بياناتك:

— تشفير كلمات المرور باستخدام bcrypt
— اتصالات HTTPS مشفرة لجميع البيانات المنقولة
— قاعدة بيانات محمية بصلاحيات وصول مقيدة
— API Keys فريدة لكل مستخدم قابلة للإلغاء في أي وقت
— جلسات JWT بصلاحية 30 يوماً مع إمكانية تسجيل الخروج

رغم جهودنا، لا يوجد نظام آمن 100%. في حال اكتشاف أي اختراق يؤثر على بياناتك، سنخطرك فوراً.`,
  },
  {
    id: "user-rights",
    title: "حقوقك",
    content: `لديك الحق في:

— **الاطلاع:** طلب نسخة من بياناتك الشخصية المخزنة لدينا
— **التصحيح:** تعديل أي بيانات غير دقيقة من خلال إعدادات حسابك
— **الحذف:** طلب حذف حسابك وجميع بياناتك نهائياً
— **الاعتراض:** رفض استخدام بياناتك لأغراض معينة
— **النقل:** الحصول على بياناتك بصيغة قابلة للقراءة

لممارسة أي من هذه الحقوق، تواصل معنا عبر البريد الإلكتروني المذكور أدناه.`,
  },
  {
    id: "cookies",
    title: "ملفات الارتباط (Cookies)",
    content: `نستخدم ملفات الارتباط الضرورية فقط لتشغيل الخدمة:

— **جلسة المستخدم:** للحفاظ على تسجيل دخولك (JWT Token)
— **تفضيلات الواجهة:** مثل السمة (فاتح/داكن)

لا نستخدم ملفات ارتباط تتبعية أو إعلانية.`,
  },
  {
    id: "retention",
    title: "مدة الاحتفاظ بالبيانات",
    content: `نحتفظ ببياناتك طالما حسابك نشط. عند إلغاء الحساب:

— تُحذف بيانات الحساب والجهات والرسائل خلال 30 يوماً
— قد تُحتفظ بعض السجلات التقنية لمدة 90 يوماً لأغراض أمنية
— البيانات المجهولة (إحصائيات إجمالية) قد تُحتفظ بها لأغراض تحليلية`,
  },
  {
    id: "children",
    title: "الأطفال دون 18 سنة",
    content: `منصتنا موجهة للأعمال التجارية وليست مخصصة للأشخاص دون 18 سنة. إذا علمنا أن شخصاً دون هذا السن قدّم بياناته، سنحذفها فوراً.`,
  },
  {
    id: "changes",
    title: "تحديثات السياسة",
    content: `قد نحدّث هذه السياسة من وقت لآخر. في حال إجراء تغييرات جوهرية، سنخطرك عبر البريد الإلكتروني أو إشعار داخل المنصة قبل 7 أيام من سريانها. الاستمرار في استخدام الخدمة بعد التحديث يُعدّ موافقة ضمنية.`,
  },
  {
    id: "contact",
    title: "تواصل معنا",
    content: `إذا كانت لديك أي استفسارات حول سياسة الخصوصية، تواصل معنا:

البريد الإلكتروني: privacy@whatspro.app
سيتم الرد خلال 72 ساعة من أيام العمل.`,
  },
];

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white" dir="rtl">
      {/* شريط علوي */}
      <div className="bg-[#075E54]">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-white/80 hover:text-white transition-colors text-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            الرجوع للرئيسية
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#25D366] flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
            </div>
            <span className="text-white font-bold text-sm">واتس برو</span>
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
            <span className="text-white/90 text-sm">محدّثة ومتوافقة مع Meta</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-3">سياسة الخصوصية</h1>
          <p className="text-white/70 text-sm">آخر تحديث: {new Date().toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" })}</p>
        </div>
      </div>

      {/* المحتوى */}
      <div className="max-w-4xl mx-auto px-6 -mt-8 pb-20">
        {/* بطاقة الفهرس */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-8">
          <p className="text-xs font-semibold text-[#075E54] uppercase tracking-wider mb-4">المحتويات</p>
          <div className="grid grid-cols-2 gap-2">
            {sections.map((s, i) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-[#075E54] transition-colors py-1"
              >
                <span className="text-[#25D366] font-mono text-xs w-5">{String(i + 1).padStart(2, "0")}</span>
                {s.title}
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
                <h2 className="text-xl font-bold text-gray-900 pt-1">{section.title}</h2>
              </div>
              <div className="text-gray-600 leading-relaxed text-[15px] whitespace-pre-line pr-13">
                {section.content.split("\n").map((line, j) => {
                  if (line.startsWith("**") && line.endsWith("**")) {
                    return <p key={j} className="font-semibold text-gray-800 mt-4 mb-1">{line.replace(/\*\*/g, "")}</p>;
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
                })}
              </div>
            </div>
          ))}
        </div>

        {/* فوتر الصفحة */}
        <div className="mt-10 p-6 bg-[#f0fdf4] rounded-2xl border border-[#dcfce7] text-center">
          <p className="text-sm text-gray-600 mb-3">
            لديك سؤال حول سياسة الخصوصية؟
          </p>
          <a
            href="mailto:privacy@whatspro.app"
            className="inline-flex items-center gap-2 bg-[#25D366] text-white px-5 py-2 rounded-full text-sm font-medium hover:bg-[#20bb5a] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            تواصل معنا
          </a>
          <div className="mt-4 pt-4 border-t border-[#dcfce7] flex justify-center gap-6 text-xs text-gray-500">
            <Link href="/terms" className="hover:text-[#075E54] transition-colors">شروط الاستخدام</Link>
            <span>•</span>
            <Link href="/" className="hover:text-[#075E54] transition-colors">الصفحة الرئيسية</Link>
          </div>
        </div>
      </div>
    </div>
  );
}