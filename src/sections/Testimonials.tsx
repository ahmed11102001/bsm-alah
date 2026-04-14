import { Card, CardContent } from '@/components/ui/card';
import { Star, Quote } from 'lucide-react';

const testimonials = [
  {
    name: 'أحمد محمد',
    role: 'مدير تسويق',
    company: 'متجر الإلكتروني',
    content: 'واتس برو غير طريقة تواصلنا مع العملاء بالكامل. نسبة الاستجابة ارتفعت بنسبة 300% وحملاتنا التسويقية أصبحت أكثر فعالية.',
    avatar: 'أ',
    rating: 5,
  },
  {
    name: 'سارة عبدالله',
    role: 'صاحبة مشروع',
    company: 'بوتيك سارة',
    content: 'أفضل استثمار قمت به لعملي. النظام سهل الاستخدام والدعم الفني رائع. أنصح به بشدة لأي صاحب عمل.',
    avatar: 'س',
    rating: 5,
  },
  {
    name: 'خالد العمري',
    role: 'مدير عام',
    company: 'شركة التقنية',
    content: 'لقد جربنا عدة أنظمة قبل واتس برو، لكن هذا النظام يتفوق عليها جميعاً من حيث السرعة والموثوقية والسعر.',
    avatar: 'خ',
    rating: 5,
  },
  {
    name: 'نورة الفهد',
    role: 'مسؤولة علاقات عملاء',
    company: 'مؤسسة النجاح',
    content: 'الأتمتة الذكية وفرت علينا ساعات من العمل اليومي. الآن نركز على ما هو أكثر أهمية بينما يتولى النظام الباقي.',
    avatar: 'ن',
    rating: 5,
  },
  {
    name: 'فهد السالم',
    role: 'رائد أعمال',
    company: 'ستارت أب السعودية',
    content: 'واجهة المستخدم رائعة وسهلة الاستخدام. تمكنت من إطلاق أول حملة تسويقية خلال 10 دقائق فقط من التسجيل.',
    avatar: 'ف',
    rating: 5,
  },
  {
    name: 'لمياء الرشيد',
    role: 'مديرة مبيعات',
    company: 'شركة العقارية',
    content: 'التقارير المفصلة ساعدتنا على فهم عملائنا بشكل أفضل وتحسين استراتيجياتنا التسويقية بشكل كبير.',
    avatar: 'ل',
    rating: 5,
  },
];

export default function Testimonials() {
  return (
    <section id="testimonials" className="py-20 lg:py-32 bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-yellow-50 border border-yellow-100 rounded-full px-4 py-2 mb-4">
            <Star className="w-4 h-4 text-yellow-600" />
            <span className="text-yellow-600 text-sm font-medium">آراء العملاء</span>
          </div>
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            ماذا يقول <span className="text-gradient">عملاؤنا</span> عنا؟
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            انضم إلى آلاف العملاء السعداء الذين يستخدمون واتس برو لتنمية أعمالهم
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((testimonial, index) => (
            <Card
              key={index}
              className="hover-lift border-0 shadow-lg bg-white"
            >
              <CardContent className="p-6">
                {/* Quote Icon */}
                <div className="mb-4">
                  <Quote className="w-8 h-8 text-[#25D366]/30" />
                </div>

                {/* Rating */}
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>

                {/* Content */}
                <p className="text-gray-700 mb-6 leading-relaxed">
                  "{testimonial.content}"
                </p>

                {/* Author */}
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-whatsapp-gradient flex items-center justify-center text-white font-bold text-lg">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900">{testimonial.name}</h4>
                    <p className="text-sm text-gray-500">
                      {testimonial.role} - {testimonial.company}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Stats */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { value: '10,000+', label: 'عميل سعيد' },
            { value: '50M+', label: 'رسالة مرسلة' },
            { value: '99.9%', label: 'نسبة التسليم' },
            { value: '4.9/5', label: 'تقييم العملاء' },
          ].map((stat, index) => (
            <div key={index} className="text-center">
              <div className="text-3xl lg:text-4xl font-bold text-gradient mb-2">
                {stat.value}
              </div>
              <div className="text-gray-600">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
