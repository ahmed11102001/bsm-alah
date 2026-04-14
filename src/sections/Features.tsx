import { Card, CardContent } from '@/components/ui/card';
import { 
  Send, 
  Users, 
  BarChart3, 
  Clock, 
  Shield, 
  Zap,
  MessageSquare,
  Settings,
  Globe
} from 'lucide-react';

const features = [
  {
    icon: Send,
    title: 'إرسال جماعي',
    description: 'أرسل آلاف الرسائل في وقت واحد لجميع عملائك بضغطة زر واحدة',
    color: 'from-green-400 to-green-600',
  },
  {
    icon: Users,
    title: 'إدارة جهات الاتصال',
    description: 'نظم جهات الاتصال الخاصة بك في مجموعات وقوائم منفصلة',
    color: 'from-blue-400 to-blue-600',
  },
  {
    icon: BarChart3,
    title: 'تقارير مفصلة',
    description: 'احصل على إحصائيات وتحليلات كاملة لحملاتك التسويقية',
    color: 'from-purple-400 to-purple-600',
  },
  {
    icon: Clock,
    title: 'جدولة الرسائل',
    description: 'حدد موعد إرسال رسائلك مسبقاً وسنقوم بالإرسال في الوقت المحدد',
    color: 'from-orange-400 to-orange-600',
  },
  {
    icon: Shield,
    title: 'أمان وحماية',
    description: 'بياناتك آمنة معنا بتشفير كامل وحماية على أعلى مستوى',
    color: 'from-red-400 to-red-600',
  },
  {
    icon: Zap,
    title: 'سرعة فائقة',
    description: 'إرسال فوري للرسائل دون تأخير مع خوادم قوية وسريعة',
    color: 'from-yellow-400 to-yellow-600',
  },
  {
    icon: MessageSquare,
    title: 'قوالب جاهزة',
    description: 'استخدم قوالب الرسائل الجاهزة أو أنشئ قوالبك الخاصة',
    color: 'from-pink-400 to-pink-600',
  },
  {
    icon: Settings,
    title: 'أتمتة ذكية',
    description: 'أتمت رسائلك التسويقية بشكل ذكي بناءً على سلوك العملاء',
    color: 'from-indigo-400 to-indigo-600',
  },
  {
    icon: Globe,
    title: 'دعم متعدد اللغات',
    description: 'أرسل رسائل بأي لغة تريدها مع دعم كامل للغة العربية',
    color: 'from-teal-400 to-teal-600',
  },
];

export default function Features() {
  return (
    <section id="features" className="py-20 lg:py-32 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-green-50 border border-green-100 rounded-full px-4 py-2 mb-4">
            <Zap className="w-4 h-4 text-[#25D366]" />
            <span className="text-[#25D366] text-sm font-medium">مميزات النظام</span>
          </div>
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            كل ما تحتاجه في <span className="text-gradient">منصة واحدة</span>
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            نوفر لك جميع الأدوات اللازمة لإدارة حملاتك التسويقية عبر الواتساب بكفاءة واحترافية
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <Card
              key={index}
              className="group hover-lift border-0 shadow-lg hover:shadow-xl bg-gradient-to-br from-white to-gray-50"
            >
              <CardContent className="p-6">
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
