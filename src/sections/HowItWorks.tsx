import { Upload, FileText, Rocket, BarChart3, ArrowLeft } from 'lucide-react';

const steps = [
  {
    n: "01",
    icon: Upload,
    color: "bg-blue-500",
    ring: "ring-blue-100",
    title: "ارفع جهات اتصالك",
    what: "Excel أو CSV أو إدخال يدوي",
    description: "النظام بيحلل الملف تلقائياً، بيميّز الأرقام الصحيحة من الغلط، وبيقسمهم لقوائم جاهزة للاستخدام.",
    time: "دقيقة واحدة",
  },
  {
    n: "02",
    icon: FileText,
    color: "bg-[#25D366]",
    ring: "ring-green-100",
    title: "اختار أو اعمل قالبك",
    what: "قوالب جاهزة أو مخصصة",
    description: "اختار من قوالبك المعتمدة أو اعمل رسالة جديدة. القوالب بتترسل عبر واتساب API الرسمي — مش هترفض.",
    time: "دقيقتين",
  },
  {
    n: "03",
    icon: Rocket,
    color: "bg-purple-500",
    ring: "ring-purple-100",
    title: "أرسل أو جدوّل الحملة",
    what: "فوري أو في الوقت اللي تختاره",
    description: "اختار الجمهور المستهدف، راجع الملخص، واضغط إرسال. واتس برو بيكمل الشغل حتى لو قفلت الجهاز.",
    time: "دقيقتين",
  },
  {
    n: "04",
    icon: BarChart3,
    color: "bg-orange-500",
    ring: "ring-orange-100",
    title: "تابع وحسّن",
    what: "تقارير لحظية كاملة",
    description: "شوف مين وصل ومين قرأ ومين رد — وعلى أساس كده خطط حملتك الجاية أذكى.",
    time: "مستمر",
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 lg:py-32 bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-white border border-gray-200 rounded-full px-4 py-2 mb-4 shadow-sm">
            <Rocket className="w-4 h-4 text-[#25D366]" />
            <span className="text-gray-600 text-sm font-medium">خطوات العمل</span>
          </div>
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            من التسجيل لأول رسالة —{" "}
            <span className="text-gradient">في أقل من 15 دقيقة</span>
          </h2>
          <p className="text-gray-500 max-w-xl mx-auto text-base leading-relaxed">
            4 خطوات واضحة. مفيش setup معقد. مفيش كورس تتعلمه.
          </p>
        </div>

        {/* Steps */}
        <div className="relative">
          {/* connector line desktop */}
          <div className="hidden lg:block absolute top-16 right-[12.5%] left-[12.5%] h-px bg-gradient-to-r from-blue-200 via-green-200 via-purple-200 to-orange-200 z-0" />

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
            {steps.map((s, i) => (
              <div key={i} className="flex flex-col items-center text-center group">
                {/* circle */}
                <div className={`relative w-16 h-16 ${s.color} ring-4 ${s.ring} rounded-2xl
                  flex items-center justify-center mb-5 shadow-md
                  group-hover:scale-110 transition-transform duration-200`}>
                  <s.icon className="w-7 h-7 text-white" />
                  <span className="absolute -top-2 -right-2 w-6 h-6 bg-white border border-gray-200
                    rounded-full text-[11px] font-bold text-gray-500 flex items-center justify-center shadow-sm">
                    {s.n}
                  </span>
                </div>

                {/* time badge */}
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                  {s.time}
                </span>

                <h3 className="text-base font-bold text-gray-900 mb-1 leading-snug">{s.title}</h3>

                <p className="text-xs font-medium text-[#25D366] mb-2">{s.what}</p>

                <p className="text-sm text-gray-500 leading-relaxed max-w-[200px]">
                  {s.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-14 bg-white border border-gray-100 rounded-3xl p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-sm">
          <div className="text-center sm:text-right">
            <p className="text-lg font-bold text-gray-900 mb-1">
              جاهز تبدأ؟ الخطوة الأولى مجانية
            </p>
            <p className="text-sm text-gray-400">
              100 رسالة مجانية — بدون بطاقة ائتمان — بدون التزام
            </p>
          </div>
          <a
            href="#"
            className="flex-shrink-0 inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#20bb5a]
              text-white font-bold px-7 py-3.5 rounded-xl transition-colors text-sm whitespace-nowrap"
          >
            ابدأ مجاناً الآن
            <ArrowLeft className="w-4 h-4" />
          </a>
        </div>

      </div>
    </section>
  );
}