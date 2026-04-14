import { Button } from '@/components/ui/button';
import { ArrowLeft, Play, Sparkles, Zap, Shield } from 'lucide-react';

interface HeroProps {
  onLoginClick: () => void;
}

export default function Hero({ onLoginClick }: HeroProps) {
  const scrollToSection = (href: string) => {
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#075E54] via-[#128C7E] to-[#25D366]">
        {/* Animated Circles */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-white/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white/3 rounded-full blur-3xl" />
      </div>

      {/* Pattern Overlay */}
      <div 
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Content */}
          <div className="text-center lg:text-right">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2 mb-6">
              <Sparkles className="w-4 h-4 text-[#25D366]" />
              <span className="text-white/90 text-sm font-medium">نظام إرسال الرسائل الأكثر تطوراً</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
              أرسل رسائل
              <span className="block text-[#25D366]">واتساب جماعية</span>
              بكل سهولة
            </h1>

            <p className="text-lg text-white/80 mb-8 max-w-xl mx-auto lg:mx-0">
              منصة متكاملة لإدارة وإرسال رسائل الواتساب للعملاء. حملات تسويقية فعالة، 
              تقارير مفصلة، وأتمتة ذكية لنمو أعمالك.
            </p>

            {/* Stats */}
            <div className="flex flex-wrap justify-center lg:justify-start gap-6 mb-8">
              <div className="flex items-center gap-2 text-white/90">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-[#25D366]" />
                </div>
                <span className="text-sm">إرسال سريع</span>
              </div>
              <div className="flex items-center gap-2 text-white/90">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                  <Shield className="w-4 h-4 text-[#25D366]" />
                </div>
                <span className="text-sm">آمن وموثوق</span>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Button
                onClick={onLoginClick}
                size="lg"
                className="bg-white text-[#128C7E] hover:bg-white/90 px-8 font-semibold"
              >
                ابدأ الآن مجاناً
                <ArrowLeft className="w-5 h-5 mr-2" />
              </Button>
              <Button
                onClick={() => scrollToSection('#how-it-works')}
                size="lg"
                variant="outline"
                className="border-white/30 text-white hover:bg-white/10 px-8"
              >
                <Play className="w-5 h-5 ml-2" />
                شاهد كيف يعمل
              </Button>
            </div>
          </div>

          {/* Hero Image/Illustration */}
          <div className="relative hidden lg:block">
            <div className="relative">
              {/* Main Phone Mockup */}
              <div className="relative bg-white rounded-[3rem] p-4 shadow-2xl max-w-sm mx-auto transform rotate-[-5deg] hover:rotate-0 transition-transform duration-500">
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-[2.5rem] p-6">
                  {/* Phone Header */}
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-full bg-[#25D366] flex items-center justify-center">
                      <span className="text-white text-xl">و</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900">واتس برو</h4>
                      <p className="text-xs text-green-600">متصل الآن</p>
                    </div>
                  </div>

                  {/* Chat Messages */}
                  <div className="space-y-3">
                    <div className="bg-white rounded-2xl rounded-tl-none p-3 shadow-sm max-w-[85%]">
                      <p className="text-sm text-gray-700">مرحباً! هل يمكنك إرسال عرض الأسعار؟</p>
                      <span className="text-[10px] text-gray-400 mt-1 block">10:30 ص</span>
                    </div>
                    <div className="bg-[#DCF8C6] rounded-2xl rounded-tr-none p-3 shadow-sm max-w-[85%] mr-auto">
                      <p className="text-sm text-gray-700">بالتأكيد! سأرسله لك خلال دقائق</p>
                      <span className="text-[10px] text-gray-500 mt-1 block text-left">10:31 ص ✓✓</span>
                    </div>
                    <div className="bg-[#DCF8C6] rounded-2xl rounded-tr-none p-3 shadow-sm max-w-[85%] mr-auto">
                      <p className="text-sm text-gray-700">تم إرسال عرض الأسعار بنجاح 📎</p>
                      <span className="text-[10px] text-gray-500 mt-1 block text-left">10:32 ص ✓✓</span>
                    </div>
                  </div>

                  {/* Phone Input */}
                  <div className="mt-6 flex items-center gap-2 bg-white rounded-full px-4 py-2 shadow-sm">
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                      <span className="text-gray-400 text-lg">+</span>
                    </div>
                    <span className="text-gray-400 text-sm">اكتب رسالة...</span>
                    <div className="w-8 h-8 rounded-full bg-[#25D366] flex items-center justify-center mr-auto">
                      <span className="text-white text-lg">➤</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating Cards */}
              <div className="absolute -top-4 -right-4 bg-white rounded-2xl p-4 shadow-xl animate-bounce">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                    <span className="text-green-600 text-lg">✓</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">تم الإرسال</p>
                    <p className="text-xs text-gray-500">1,234 رسالة</p>
                  </div>
                </div>
              </div>

              <div className="absolute -bottom-4 -left-4 bg-white rounded-2xl p-4 shadow-xl animate-bounce delay-500">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-blue-600 text-lg">👥</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">جهات اتصال</p>
                    <p className="text-xs text-gray-500">5,678 عميل</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Wave */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 85C1200 90 1320 90 1380 90L1440 90V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z"
            fill="white"
          />
        </svg>
      </div>
    </section>
  );
}
