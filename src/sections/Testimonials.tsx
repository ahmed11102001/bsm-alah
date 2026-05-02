import { Card, CardContent } from '@/components/ui/card';
import { Star, Quote } from 'lucide-react';

const testimonials = [
  {
    name: 'محمد عبد الله',
    role: 'صاحب متجر أونلاين',
    company: 'القاهرة',
    content: 'واتس برو ساعدني أتابع العملاء بشكل أسرع وبقيت أرد على الرسائل بشكل منظم بدل العشوائية اللي كانت قبل كده.',
    avatar: 'م',
    rating: 5,
  },
  {
    name: 'أحمد حسن',
    role: 'مسوق رقمي',
    company: 'الإسكندرية',
    content: 'بستخدم النظام في إرسال حملات واتساب، وفر عليا وقت كبير في التواصل مع العملاء بدل الشغل اليدوي.',
    avatar: 'أ',
    rating: 5,
  },
  {
    name: ' ندي حمدي',
    role: 'صاحبة مشروع صغير',
    company: 'الاسكندرية',
    content: 'الواجهة بسيطة وسهلة، قدرت أبدأ حملة خلال دقائق بدون أي خبرة تقنية.',
    avatar: 'ن',
    rating: 5,
  },
  {
    name: 'خالد محمود',
    role: 'مدير مبيعات',
    company: 'القاهرة',
    content: 'ساعدنا في تنظيم التواصل مع العملاء وتحسين متابعة الطلبات بشكل أفضل.',
    avatar: 'خ',
    rating: 4,
  },
  {
    name: 'نورهان السيد',
    role: 'خدمة عملاء',
    company: 'المنصورة',
    content: 'بقى عندنا ردود أسرع وتنظيم أحسن للرسائل بدل الفوضى اللي كانت قبل كده.',
    avatar: 'ن',
    rating: 5,
  },
  {
    name: 'عبد الرحمن سامي',
    role: 'رائد أعمال',
    company: 'الفيوم',
    content: 'فكرة النظام مفيدة جدًا لأي حد عنده بيزنس صغير وعايز يبدأ يظبط التواصل مع العملاء.',
    avatar: 'ع',
    rating: 4,
  },
];

export default function Testimonials() {
  return (
    <section id="testimonials" className="py-20 lg:py-32 bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-yellow-50 border border-yellow-100 rounded-full px-4 py-2 mb-4">
            <Star className="w-4 h-4 text-yellow-600" />
            <span className="text-yellow-600 text-sm font-medium">آراء المستخدمين</span>
          </div>

          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            آراء <span className="text-gradient">حقيقية</span> من المستخدمين
          </h2>

          <p className="text-gray-600 max-w-2xl mx-auto">
            تجارب من أصحاب مشاريع صغيرة ومسوقين بيستخدموا واتس برو في شغلهم اليومي
          </p>
        </div>

        {/* Testimonials */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((testimonial, index) => (
            <Card key={index} className="hover-lift border-0 shadow-lg bg-white">
              <CardContent className="p-6">

                <div className="mb-4">
                  <Quote className="w-8 h-8 text-[#25D366]/30" />
                </div>

                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>

                <p className="text-gray-700 mb-6 leading-relaxed">
                  "{testimonial.content}"
                </p>

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

        {/* Stats (واقعية) */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { value: '120+', label: 'مستخدم نشط' },
            { value: '15K+', label: 'رسالة مرسلة' },
            { value: '95%', label: 'نسبة نجاح الإرسال' },
            { value: '4.6/5', label: 'تقييم المستخدمين' },
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