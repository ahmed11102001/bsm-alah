import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, Sparkles } from 'lucide-react';

const plans = [
  {
    name: 'الباقة الأساسية',
    price: 99,
    messages: 1000,
    features: [
      '1,000 رسالة شهرياً',
      'إدارة 500 جهة اتصال',
      '5 قوالب رسائل',
      'تقارير أساسية',
      'دعم فني عبر البريد',
    ],
    popular: false,
    color: 'border-gray-200',
    buttonVariant: 'outline' as const,
  },
  {
    name: 'الباقة الاحترافية',
    price: 299,
    messages: 5000,
    features: [
      '5,000 رسالة شهرياً',
      'إدارة 2,500 جهة اتصال',
      '20 قالب رسائل',
      'تقارير متقدمة',
      'دعم فني مباشر',
      'جدولة الرسائل',
      'أتمتة ذكية',
    ],
    popular: true,
    color: 'border-[#25D366] ring-2 ring-[#25D366]/20',
    buttonVariant: 'default' as const,
  },
  {
    name: 'الباقة المتقدمة',
    price: 599,
    messages: 15000,
    features: [
      '15,000 رسالة شهرياً',
      'جهات اتصال غير محدودة',
      'قوالب غير محدودة',
      'تقارير شاملة',
      'دعم فني 24/7',
      'جدولة الرسائل',
      'أتمتة ذكية متقدمة',
      'وصول API كامل',
    ],
    popular: false,
    color: 'border-gray-200',
    buttonVariant: 'outline' as const,
  },
];

export default function Pricing() {
  return (
  <section id="pricing" className="py-20 lg:py-32 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-purple-50 border border-purple-100 rounded-full px-4 py-2 mb-4">
            <Sparkles className="w-4 h-4 text-purple-600" />
            <span className="text-purple-600 text-sm font-medium">باقات الأسعار</span>
          </div>
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            اختر <span className="text-gradient">الباقة المناسبة</span> لك
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            باقات مرنة تناسب جميع الاحتياجات، ابدأ مجاناً وقم بالترقية وقتما تشاء
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <Card
              key={index}
              className={`relative hover-lift border-2 ${plan.color} ${
                plan.popular ? 'shadow-2xl scale-105' : 'shadow-lg'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <div className="bg-whatsapp-gradient text-white text-sm font-bold px-4 py-1 rounded-full">
                    الأكثر شعبية
                  </div>
                </div>
              )}

              <CardContent className="p-8">
                {/* Plan Name */}
                <h3 className="text-xl font-bold text-gray-900 text-center mb-2">
                  {plan.name}
                </h3>

                {/* Price */}
                <div className="text-center mb-6">
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                    <span className="text-gray-500">ريال/شهر</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    {plan.messages.toLocaleString()} رسالة
                  </p>
                </div>

                {/* Features */}
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                        <Check className="w-3 h-3 text-green-600" />
                      </div>
                      <span className="text-gray-700 text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <Button
                  className={`w-full ${
                    plan.popular
                      ? 'bg-whatsapp-gradient hover:opacity-90 text-white'
                      : 'border-2 border-gray-200 hover:border-[#25D366] hover:text-[#25D366]'
                  }`}
                  variant={plan.buttonVariant}
                >
                  ابدأ الآن
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Enterprise CTA */}
        <div className="mt-16 text-center">
          <p className="text-gray-600 mb-4">
            هل تحتاج إلى باقة مخصصة لشركتك؟
          </p>
          <Button variant="outline" className="border-[#25D366] text-[#25D366] hover:bg-[#25D366] hover:text-white">
            تواصل مع فريق المبيعات
          </Button>
        </div>
      </div>
    </section>
  );
}
