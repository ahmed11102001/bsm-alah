import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { HelpCircle } from 'lucide-react';

const faqs = [
  {
    question: 'ما هو واتس برو وكيف يعمل؟',
    answer: 'واتس برو هو منصة متكاملة لإدارة وإرسال رسائل الواتساب للعملاء. يتيح لك إنشاء حملات تسويقية، إدارة جهات الاتصال، جدولة الرسائل، ومتابعة النتائج بشكل احترافي. كل ما عليك هو التسجيل، رفع جهات الاتصال، وإنشاء رسالتك الأولى.',
  },
  {
    question: 'هل النظام آمن وموثوق؟',
    answer: 'نعم، نحن نستخدم أحدث تقنيات التشفير لحماية بياناتك وبيانات عملائك. جميع الرسائل تُرسل عبر خوادم آمنة وموثوقة، ونحن ملتزمون بأعلى معايير الأمان والخصوصية.',
  },
  {
    question: 'هل يمكنني تجربة النظام قبل الاشتراك؟',
    answer: 'بالتأكيد! نقدم باقة مجانية تتيح لك إرسال 100 رسالة لتجربة النظام والتعرف على مميزاته. يمكنك الترقية إلى الباقة المدفوعة في أي وقت.',
  },
  {
    question: 'كيف يمكنني رفع جهات الاتصال؟',
    answer: 'يمكنك رفع جهات الاتصال بثلاث طرق: 1) استيراد من ملف Excel أو CSV، 2) إضافة يدوية واحداً تلو الآخر، 3) استيراد من Google Contacts. النظام يدعم جميع صيغ الملفات الشائعة.',
  },
  {
    question: 'هل يمكنني جدولة الرسائل مسبقاً؟',
    answer: 'نعم، يمكنك جدولة رسائلك ليتم إرسالها في أي وقت تريده. ما عليك سوى اختيار التاريخ والوقت المناسبين، وسيقوم النظام بالإرسال تلقائياً في الوقت المحدد.',
  },
  {
    question: 'ما هي طرق الدفع المتاحة؟',
    answer: 'نحن ندعم عدة طرق دفع تشمل: البطاقات الائتمانية (Visa, MasterCard)، مدى، Apple Pay، Google Pay، والتحويل البنكي. جميع المدفوعات آمنة ومحمية.',
  },
  {
    question: 'هل يمكنني إلغاء الاشتراك في أي وقت؟',
    answer: 'نعم، يمكنك إلغاء اشتراكك في أي وقت دون أي التزامات. لن يتم خصم أي مبالغ إضافية بعد الإلغاء، ويمكنك الاستمرار في استخدام الباقة حتى نهاية فترة الاشتراك الحالية.',
  },
  {
    question: 'هل يوجد دعم فني متاح؟',
    answer: 'نعم، نقدم دعم فني على مدار الساعة لعملاء الباقات المتقدمة. أما عملاء الباقات الأساسية فيحصلون على دعم فني عبر البريد الإلكتروني خلال ساعات العمل.',
  },
];

export default function FAQ() {
  return (
    <section id="faq" className="py-20 lg:py-32 bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-green-50 border border-green-100 rounded-full px-4 py-2 mb-4">
            <HelpCircle className="w-4 h-4 text-[#25D366]" />
            <span className="text-[#25D366] text-sm font-medium">الأسئلة الشائعة</span>
          </div>
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            الأسئلة <span className="text-gradient">الأكثر شيوعاً</span>
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            إذا كان لديك سؤال آخر، لا تتردد في التواصل مع فريق الدعم الفني
          </p>
        </div>

        {/* FAQ Accordion */}
        <Accordion type="single" collapsible className="space-y-4">
          {faqs.map((faq, index) => (
            <AccordionItem
              key={index}
              value={`item-${index}`}
              className="border border-gray-200 rounded-xl px-6 data-[state=open]:border-[#25D366]/30 data-[state=open]:bg-green-50/30"
            >
              <AccordionTrigger className="text-right font-semibold text-gray-900 hover:text-[#25D366] py-4">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-gray-600 leading-relaxed pb-4">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        {/* Contact CTA */}
        <div className="mt-12 text-center bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-8">
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            لم تجد إجابة لسؤالك؟
          </h3>
          <p className="text-gray-600 mb-4">
            فريق الدعم الفني جاهز لمساعدتك على مدار الساعة
          </p>
          <a
            href="#"
            className="inline-flex items-center gap-2 text-[#25D366] font-semibold hover:underline"
          >
            تواصل معنا
            <span>←</span>
          </a>
        </div>
      </div>
    </section>
  );
}
