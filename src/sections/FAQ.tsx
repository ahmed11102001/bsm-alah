import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { HelpCircle, ArrowLeft } from 'lucide-react';

const faqs = [
  {
    category: "النظام والإمكانيات",
    question: "واتس برو مجرد أداة إرسال ولا في أكثر من كده؟",
    answer: `واتس برو CRM متكامل يدير دورة حياة العميل بالكامل — من أول رسالة لحد ما يصبح عميل دائم.

بتبدأ بـ إدارة جهات الاتصال المتقدمة: استيراد وتصنيف وتقسيم الجمهور بدقة.

ثم الحملات التسويقية بالجملة: بترسل لآلاف العملاء في دقائق بقوالب معتمدة من واتساب.

وكمان صندوق الوارد الذكي: ترد على كل عميل بشكل شخصي مع تاريخ المحادثة الكامل.

وتقارير حقيقية بتحكي: مين فتح، مين رد، مين محتاج متابعة، وأي حملة كانت الأعلى مبيعاً.

الفرق بيننا وبين أدوات الإرسال العادية؟ إنت شايف العميل مش بس رقم.`,
  },
  {
    category: "النظام والإمكانيات",
    question: "أنا شغال بمفردي — هل النظام ده مناسب لي ولا بس للشركات الكبيرة؟",
    answer: `ده بالظبط الكلام اللي بيقوله كل عميل فردي قبل ما يشترك — وبعدين بيقول "ليه ما بدأتش من زمان؟"

النظام اتصمم عشان يجعلك تشتغل بكفاءة فريق كامل وإنت لوحدك.

قوالب جاهزة للرد على الأسئلة المتكررة ← بتوفر ساعات.
حملة واحدة بتوصل لـ 5,000 عميل ← مش ممكن تعملها يدوي.
تذكيرات تلقائية للمتابعة ← مش هتنسى عميل تاني.

الشركات الكبيرة بتشتري لأنها عندها فريق — إنت بتشتري عشان مش عندك فريق.`,
  },
  {
    category: "الأمان والموثوقية",
    question: "هل الإرسال ده هيضر حساب واتساب بتاعي؟",
    answer: `السؤال ده مهم جداً وكل الناس بتسأله — والإجابة الصريحة: بيعتمد على الطريقة.

إزاي واتس برو بيحميك:
✓ بنشتغل من خلال واتساب بيزنس API الرسمي — مش تطبيقات هاك أو emulators.
✓ كل رسالة بتتبع قواعد Meta وسياسات واتساب الرسمية.
✓ القوالب بتتراجعها Meta قبل الإرسال.
✓ نسبة التسليم عندنا 98.5% بدون إيقاف حسابات.

اللي بيضر الحسابات هو أدوات الإرسال العشوائي غير الرسمية — واتس برو هو عكسهم تماماً.`,
  },
  {
    category: "الأمان والموثوقية",
    question: "بيانات عملائي هتكون آمنة؟",
    answer: `بنتعامل مع بيانات عملائك زي ما بتتعامل مع أسرارك التجارية — بحماية كاملة.

البيانات مشفرة بـ AES-256 في التخزين وTLS 1.3 في النقل.
كل مستخدم بيشوف بياناته بس — مفيش تقاطع بين الحسابات أبداً.
سيرفراتنا على Neon + Vercel مع backups تلقائية يومية.
مفيش بيع لأي بيانات لأي طرف ثالث — النموذج التجاري بتاعنا قائم على اشتراكاتك إنت مش على بياناتك.

حقك الكامل في تحميل أو حذف بياناتك في أي وقت.`,
  },
  {
    category: "التجربة والاشتراك",
    question: "هل أقدر أجرب قبل ما أدفع؟",
    answer: `نعم — وبدون بطاقة ائتمان ومن غير ما تحس إن في حد بيضغط عليك.

الباقة المجانية بتديك:
→ 100 رسالة فعلية عشان تشوف النتائج بنفسك
→ الوصول لكل مميزات الداشبورد كاملة
→ صندوق الوارد والتقارير من اليوم الأول
→ دعم فني حقيقي مش روبوت

معظم عملاءنا بيحولوا لباقة مدفوعة خلال 3 أيام من التجربة.
مش عشان إحنا بنضغط — عشان النتائج بتتكلم.`,
  },
  {
    category: "التجربة والاشتراك",
    question: "كام وقت هيأخذ مني إني أبدأ فعلاً؟",
    answer: `العميل الأسرع عندنا بدأ حملته الأولى في 8 دقائق من وقت التسجيل.

الخطوات الفعلية:
1. إنشاء حساب ← 2 دقيقة
2. ربط واتساب بيزنس API ← 5 دقائق (دليل مرئي خطوة بخطوة)
3. رفع جهات اتصالك من Excel ← 1 دقيقة
4. اختيار قالب وإرسال أول حملة ← 2 دقيقة

المجموع الفعلي: أقل من 15 دقيقة لحد ما الرسائل تبدأ توصل.`,
  },
  {
    category: "الفريق والإدارة",
    question: "عندي موظفين — ازاي يشتغلوا على النظام بدون ما يشوفوا الإعدادات الحساسة؟",
    answer: `ده سؤال كل صاحب عمل محترم بيسأله — وعندنا إجابة كاملة.

نظام الصلاحيات في واتس برو عندك 3 مستويات:

المالك (إنت) ← يشوف ويعدل كل حاجة بما فيها الإعدادات المالية وبيانات API.

موظف وصول كامل ← يشتغل على المحادثات والحملات والتقارير — ما يشوفش إعدادات الحساب ولا بيانات الدفع.

موظف دردشة فقط ← بيرد على العملاء بس — مش عارف يرسل حملات أو يشوف تقارير.

كل موظف بيدخل بكود دعوة خاص — وإنت اللي بتتحكم في مين يشوف إيه.`,
  },
  {
    category: "الفريق والإدارة",
    question: "ممكن أتابع أداء موظفيني من النظام؟",
    answer: `مش بس ممكن — ده من أقوى مزايا النظام.

صفحة التقارير بتديك:
📊 كام رسالة بعتها كل موظف في أي فترة زمنية
💬 كام عميل رد عليه — ومين الأسرع في الرد
📈 معدل إغلاق المحادثات لكل فرد في الفريق
⏰ متوسط وقت الرد لكل موظف

وبكده إنت مش بس بتبيع أكتر — إنت بتبني فريق مبيعات بيانات حقيقية مش تخمين.`,
  },
  {
    category: "التقارير والنتائج",
    question: "هعرف أقيّم نتائج حملاتي بدقة؟",
    answer: `الرقم الوحيد اللي لازم تعرفه: إيه اللي اشتغل وإيه اللي محتاج تغيير.

واتس برو بيديك لكل حملة:
✓ نسبة التسليم (وصل للهاتف)
✓ نسبة الفتح (قرأ الرسالة)
✓ نسبة الرد (تفاعل فعلي)
✓ مقارنة بين الحملات (أي قالب أحسن؟)
✓ أفضل وقت للإرسال (بالساعة)
✓ سجل كامل لكل رسالة — مين بعت، لمين، امتى

وتقدر تصدر كل ده Excel بضغطة زرار وتحطه في ريبورت للعميل أو الشريك.`,
  },
  {
    category: "التقارير والنتائج",
    question: "هل أقدر أوقف الاشتراك وأرجع وقتما أشاء؟",
    answer: `نعم — بدون أي عقوبة أو تعقيد.

إلغاء الاشتراك بضغطة زرار من الإعدادات.
بياناتك وجهات اتصالك موجودة لمدة 30 يوم بعد الإلغاء تقدر تصدرها.
مفيش رسوم إلغاء مسبق أو التزامات سنوية إجبارية.
لو رجعت — كل حاجاتك في مكانها.

إحنا مش خايفين تلغي — عارفين إنك هترجع لما تشوف الفرق.`,
  },
];

// Group by category
const grouped = faqs.reduce<Record<string, typeof faqs>>((acc, faq) => {
  if (!acc[faq.category]) acc[faq.category] = [];
  acc[faq.category].push(faq);
  return acc;
}, {});

const categoryColors: Record<string, string> = {
  "النظام والإمكانيات":  "bg-blue-50 text-blue-700 border-blue-100",
  "الأمان والموثوقية":   "bg-green-50 text-green-700 border-green-100",
  "التجربة والاشتراك":   "bg-purple-50 text-purple-700 border-purple-100",
  "الفريق والإدارة":     "bg-orange-50 text-orange-700 border-orange-100",
  "التقارير والنتائج":   "bg-teal-50 text-teal-700 border-teal-100",
};

export default function FAQ() {
  return (
    <section id="faq" className="py-20 lg:py-32 bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-green-50 border border-green-100 rounded-full px-4 py-2 mb-4">
            <HelpCircle className="w-4 h-4 text-[#25D366]" />
            <span className="text-[#25D366] text-sm font-medium">الأسئلة الشائعة</span>
          </div>
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            كل سؤال في دماغك{" "}
            <span className="text-gradient">إجابته هنا</span>
          </h2>
          <p className="text-gray-500 max-w-2xl mx-auto text-base leading-relaxed">
            مش أسئلة شكلية — أسئلة حقيقية بتجيها قبل ما تقرر. إجابات صريحة بدون مبالغة.
          </p>
        </div>

        {/* FAQ by category */}
        <div className="space-y-10">
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category}>
              {/* Category label */}
              <div className="mb-4">
                <span className={`inline-block text-xs font-bold px-3 py-1.5 rounded-full border ${categoryColors[category] ?? "bg-gray-50 text-gray-600 border-gray-100"}`}>
                  {category}
                </span>
              </div>

              <Accordion type="single" collapsible className="space-y-3">
                {items.map((faq, i) => (
                  <AccordionItem
                    key={i}
                    value={`${category}-${i}`}
                    className="border border-gray-200 rounded-2xl px-6
                      data-[state=open]:border-[#25D366]/40
                      data-[state=open]:bg-gradient-to-br
                      data-[state=open]:from-green-50/40
                      data-[state=open]:to-white
                      transition-all duration-200"
                  >
                    <AccordionTrigger className="text-right font-semibold text-gray-900 hover:text-[#25D366] py-5 text-[15px] leading-snug">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="pb-5">
                      <div className="text-gray-600 leading-relaxed text-sm whitespace-pre-line space-y-1">
                        {faq.answer}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-16 relative overflow-hidden bg-gradient-to-bl from-[#25D366]/10 via-white to-[#128C7E]/5 border border-[#25D366]/20 rounded-3xl p-8 text-center">
          {/* decorative circles */}
          <div className="absolute -top-8 -right-8 w-32 h-32 bg-[#25D366]/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-[#128C7E]/10 rounded-full blur-2xl pointer-events-none" />

          <div className="relative">
            <p className="text-xs font-bold text-[#25D366] tracking-widest uppercase mb-2">لسه مش متأكد؟</p>
            <h3 className="text-xl lg:text-2xl font-bold text-gray-900 mb-2">
              جرب مجاناً — وخلي النتائج تقنعك
            </h3>
            <p className="text-gray-500 text-sm mb-6 max-w-md mx-auto leading-relaxed">
              100 رسالة مجانية بدون بطاقة ائتمان. لو مش عجبك بعد التجربة، مش هتخسر حاجة.
              لو عجبك — هتعرف ليه كل اللي جربوا رجعوا.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <a
                href="#"
                className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#20bb5a] text-white font-bold px-7 py-3.5 rounded-xl transition-colors text-sm"
              >
                ابدأ مجاناً الآن
                <ArrowLeft className="w-4 h-4" />
              </a>
              <a
                href="#"
                className="inline-flex items-center gap-2 text-gray-600 hover:text-[#25D366] font-medium text-sm transition-colors"
              >
                أو تواصل مع الدعم
              </a>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}