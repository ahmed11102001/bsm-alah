import { Zap, Send, Users, BarChart3, Clock, Shield, MessageSquare, RefreshCw, Eye } from 'lucide-react';

const features = [
  {
    icon: Send,
    title: "آلاف الرسائل — بضغطة واحدة",
    hook: "مش ضروري تبعت رسالة رسالة",
    description: "أنشئ حملة، ارفع جهات الاتصال، واضغط إرسال. واتس برو بيتولى الباقي ويبعت لكل عميل بشكل فردي — مش كإعلان جماعي.",
    color: "bg-[#25D366]",
    light: "bg-green-50",
    border: "border-green-100",
  },
  {
    icon: Users,
    title: "جمهورك منقسم — مش تل واحد",
    hook: "مش كل العملاء زي بعض",
    description: "قسّم عملاءك لقوائم: VIP، مهتمين، غير مستجيبين، عملاء جدد. وكل قائمة تاخد الرسالة المناسبة لها.",
    color: "bg-blue-500",
    light: "bg-blue-50",
    border: "border-blue-100",
  },
  {
    icon: Eye,
    title: "شوف مين قرأ ومين مش رد",
    hook: "مش بس 'تم الإرسال'",
    description: "لكل رسالة حالة: مرسلة ✓ — وصلت ✓✓ — قُرئت ✓✓ زرقاء. وتقارير كاملة توريك مين يحتاج متابعة.",
    color: "bg-purple-500",
    light: "bg-purple-50",
    border: "border-purple-100",
  },
  {
    icon: Clock,
    title: "الرسالة الصح في الوقت الصح",
    hook: "7 الصبح مش وقت رسائل",
    description: "جدوّل حملاتك للوقت اللي عملاءك بيكونوا فيه نشطين. التقارير بتديك أفضل وقت للإرسال بالساعة.",
    color: "bg-orange-500",
    light: "bg-orange-50",
    border: "border-orange-100",
  },
  {
    icon: MessageSquare,
    title: "قوالب معتمدة — مش هترفض",
    hook: "ما تتعب في إعادة الكتابة",
    description: "قوالبك بتتراجعها Meta مرة واحدة وتستخدمها مرات لا نهائية. ردود فعلية من صندوق الوارد بدون ما تترك النظام.",
    color: "bg-pink-500",
    light: "bg-pink-50",
    border: "border-pink-100",
  },
  {
    icon: RefreshCw,
    title: "فريقك يشتغل معاك — مش بدلك",
    hook: "مش لازم تعمل كل حاجة لوحدك",
    description: "أضف موظفين بصلاحيات محددة. كل واحد يشوف بس اللي محتاج يشوفه — وإنت عارف مين بعت إيه ولمين.",
    color: "bg-indigo-500",
    light: "bg-indigo-50",
    border: "border-indigo-100",
  },
  {
    icon: BarChart3,
    title: "تقارير تقولك اتكسبت إيه",
    hook: "مش أرقام ديكور",
    description: "أفضل حملة، أعلى وقت تفاعل، العملاء الأكثر استجابة. تصدر الكل بـ Excel وتبني قرارات مبنية على بيانات.",
    color: "bg-teal-500",
    light: "bg-teal-50",
    border: "border-teal-100",
  },
  {
    icon: Shield,
    title: "حسابك واتساب محمي — مش في خطر",
    hook: "أدوات الإرسال العشوائي بتضر",
    description: "إحنا بنشتغل على واتساب بيزنس API الرسمي — مش أدوات هاك. نسبة تسليم 98.5% بدون أي إيقاف للحسابات.",
    color: "bg-red-500",
    light: "bg-red-50",
    border: "border-red-100",
  },
  {
    icon: Zap,
    title: "جاهز في 15 دقيقة — مش أيام",
    hook: "ما في setup معقد",
    description: "سجّل، اربط واتساب بيزنس API بمساعدة دليل خطوة بخطوة، ارفع جهات اتصالك، وابدأ أول حملة. كل ده في ربع ساعة.",
    color: "bg-yellow-500",
    light: "bg-yellow-50",
    border: "border-yellow-100",
  },
];

export default function Features() {
  return (
    <section id="features" className="py-20 lg:py-32 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-green-50 border border-green-100 rounded-full px-4 py-2 mb-4">
            <Zap className="w-4 h-4 text-[#25D366]" />
            <span className="text-[#25D366] text-sm font-medium">مميزات النظام</span>
          </div>
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            مش بس أداة إرسال —{" "}
            <span className="text-gradient">نظام تشغيل كامل</span>
          </h2>
          <p className="text-gray-500 max-w-2xl mx-auto text-base leading-relaxed">
            كل ميزة اتبنت عشان تحل مشكلة حقيقية بتواجهها في تواصلك مع العملاء يومياً
          </p>
        </div>

        {/* Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <div
              key={i}
              className={`group relative ${f.light} border ${f.border} rounded-2xl p-6
                hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-default`}
            >
              {/* icon */}
              <div className={`w-11 h-11 ${f.color} rounded-xl flex items-center justify-center mb-4
                group-hover:scale-110 transition-transform duration-200`}>
                <f.icon className="w-5 h-5 text-white" />
              </div>

              {/* hook label */}
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                {f.hook}
              </p>

              <h3 className="text-base font-bold text-gray-900 mb-2 leading-snug">
                {f.title}
              </h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                {f.description}
              </p>
            </div>
          ))}
        </div>

        {/* Bottom social proof strip */}
        <div className="mt-14 flex flex-wrap items-center justify-center gap-x-10 gap-y-4 text-sm text-gray-400">
          {[
            { val: "+98.5%", label: "نسبة التسليم" },
            { val: "15 دقيقة", label: "وقت الإعداد" },
            { val: "24/7", label: "دعم فني" },
            { val: "API رسمي", label: "واتساب بيزنس" },
          ].map((s) => (
            <div key={s.val} className="flex items-center gap-2">
              <span className="font-bold text-[#25D366] text-base">{s.val}</span>
              <span>{s.label}</span>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}