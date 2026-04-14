import { Card, CardContent } from '@/components/ui/card';
import { Upload, MessageSquare, Send, BarChart3 } from 'lucide-react';

const steps = [
  {
    number: '01',
    icon: Upload,
    title: 'رفع جهات الاتصال',
    description: 'قم برفع قائمة جهات الاتصال الخاصة بك بسهولة عبر ملف Excel أو CSV، أو أضفها يدوياً واحداً تلو الآخر',
    color: 'bg-blue-500',
  },
  {
    number: '02',
    icon: MessageSquare,
    title: 'إنشاء الرسالة',
    description: 'اكتب رسالتك أو اختر من قوالبنا الجاهزة. يمكنك إضافة متغيرات مثل اسم العميل لتخصيص الرسالة',
    color: 'bg-green-500',
  },
  {
    number: '03',
    icon: Send,
    title: 'إرسال الحملة',
    description: 'اختر جهات الاتصال المستهدفة واضغط إرسال. سيتم إرسال رسائلك فوراً أو جدولها للوقت المناسب',
    color: 'bg-purple-500',
  },
  {
    number: '04',
    icon: BarChart3,
    title: 'متابعة النتائج',
    description: 'تابع أداء حملتك لحظياً مع إحصائيات مفصلة عن الرسائل المرسلة والمستلمة والمقروءة',
    color: 'bg-orange-500',
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 lg:py-32 bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-full px-4 py-2 mb-4">
            <span className="text-blue-600 text-sm font-medium">خطوات العمل</span>
          </div>
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            كيف يعمل <span className="text-gradient">واتس برو</span>؟
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            أربع خطوات بسيطة تفصلك عن إطلاق حملتك التسويقية الناجحة
          </p>
        </div>

        {/* Steps */}
        <div className="relative">
          {/* Connection Line - Desktop */}
          <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-1 bg-gradient-to-r from-blue-200 via-green-200 to-purple-200 -translate-y-1/2 z-0" />

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 relative z-10">
            {steps.map((step, index) => (
              <Card
                key={index}
                className="group hover-lift border-0 shadow-xl bg-white overflow-visible"
              >
                <CardContent className="p-6 text-center relative">
                  {/* Step Number */}
                  <div className={`absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 ${step.color} rounded-full flex items-center justify-center text-white text-sm font-bold shadow-lg`}>
                    {step.number}
                  </div>

                  {/* Icon */}
                  <div className={`w-20 h-20 ${step.color} rounded-2xl flex items-center justify-center mx-auto mb-6 mt-4 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                    <step.icon className="w-10 h-10 text-white" />
                  </div>

                  <h3 className="text-xl font-bold text-gray-900 mb-3">
                    {step.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed text-sm">
                    {step.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Video CTA */}
        <div className="mt-16 text-center">
          <div className="inline-flex items-center gap-4 bg-white rounded-2xl p-4 shadow-lg">
            <div className="w-12 h-12 rounded-full bg-[#25D366] flex items-center justify-center cursor-pointer hover:scale-110 transition-transform">
              <span className="text-white text-xl">▶</span>
            </div>
            <div className="text-right">
              <p className="font-bold text-gray-900">شاهد الفيديو التوضيحي</p>
              <p className="text-sm text-gray-500">مدة الفيديو: 2 دقيقة</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
