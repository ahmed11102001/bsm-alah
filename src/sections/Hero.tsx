"use client";

import { Button } from '@/components/ui/button';
import { ArrowLeft, Play, Sparkles, Zap, Shield, Send, Paperclip, Smile, MoreVertical, Phone, Video, CheckCheck } from 'lucide-react';

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
      {/* Background Gradient - ألوان واتساب */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#075E54] via-[#128C7E] to-[#25D366]">
        {/* Animated Circles - تأثيرات الخلفية */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-white/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white/3 rounded-full blur-3xl" />
        <div className="absolute top-40 right-20 w-48 h-48 bg-[#25D366]/20 rounded-full blur-3xl animate-pulse delay-700" />
        <div className="absolute bottom-40 left-20 w-56 h-56 bg-[#075E54]/30 rounded-full blur-3xl animate-pulse delay-1400" />
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
          {/* الجانب الأيمن - المحتوى النصي */}
          <div className="text-center lg:text-right">
            {/* Badge متحرك */}
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2 mb-6 animate-float">
              <Sparkles className="w-4 h-4 text-[#25D366] animate-pulse" />
              <span className="text-white/90 text-sm font-medium">نظام CRM الاكثر تطورا</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
             أرسل رسائلك، تواصل مع جمهورك
              <span className="block text-[#25D366] drop-shadow-lg">حقق نمواً غير مسبوق لمبيعاتك</span>
              بكل سهولة
            </h1>

            <p className="text-lg text-white/80 mb-8 max-w-xl mx-auto lg:mx-0 leading-relaxed">
             ليس مجرد ارسال رسائل ... بل منصة متكاملة  لادارة حملاتك التسويقية ع الواتساب بدون فوض بدون تاخير وبأعلي كفائة
            </p>

            {/* Stats - إحصائيات متحركة */}
            <div className="flex flex-wrap justify-center lg:justify-start gap-6 mb-8">
              <div className="flex items-center gap-2 text-white/90 group hover:scale-105 transition-transform duration-300">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center group-hover:bg-[#25D366]/20 transition-colors">
                  <Zap className="w-4 h-4 text-[#25D366]" />
                </div>
                <span className="text-sm">إرسال سريع</span>
              </div>
              <div className="flex items-center gap-2 text-white/90 group hover:scale-105 transition-transform duration-300">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center group-hover:bg-[#25D366]/20 transition-colors">
                  <Shield className="w-4 h-4 text-[#25D366]" />
                </div>
                <span className="text-sm">آمن وموثوق</span>
              </div>
              <div className="flex items-center gap-2 text-white/90 group hover:scale-105 transition-transform duration-300">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center group-hover:bg-[#25D366]/20 transition-colors">
                  <CheckCheck className="w-4 h-4 text-[#25D366]" />
                </div>
                <span className="text-sm">تسليم فوري</span>
              </div>
            </div>

            {/* CTA Buttons - الأزرار مع أنيميشن متقدم */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              {/* زر ابدأ الآن - مع أنيميشن نبض وتوهج */}
              <Button
                onClick={onLoginClick}
                size="lg"
                className="bg-white text-[#128C7E] hover:bg-white/90 px-8 font-semibold shadow-lg hover:shadow-xl transition-all duration-300 btn-start animate-btn-glow"
              >
                ابدأ الآن مجاناً
                <ArrowLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform duration-300" />
              </Button>
              
              {/* زر شاهد كيف يعمل */}
              <Button
                onClick={() => scrollToSection('#how-it-works')}
                size="lg"
                variant="outline"
                className="border-white/30 text-white hover:bg-white/10 px-8 group"
              >
                <Play className="w-5 h-5 ml-2 group-hover:scale-110 transition-transform duration-300" />
                شاهد كيف يعمل
              </Button>
            </div>
          </div>

          {/* الجانب الأيسر - موبايل واتساب Mockup */}
          <div className="relative hidden lg:block">
            <div className="relative">
              {/* Main Phone Mockup - بتأثير الدوران */}
              <div className="relative bg-white rounded-[3rem] p-3 shadow-2xl max-w-sm mx-auto transform rotate-[-3deg] hover:rotate-0 transition-all duration-700 hover:scale-105">
                {/* شاشة الموبايل */}
                <div className="bg-[#ECE5DD] rounded-[2.5rem] overflow-hidden">
                  
                  {/* رأس المحادثة - Header WhatsApp */}
                  <div className="bg-[#075E54] px-4 py-3 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#25D366] flex items-center justify-center shadow-lg">
                      <span className="text-white text-xl font-bold">و</span>
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-white">واتس برو</div>
                      <div className="text-xs text-green-300 flex items-center gap-1">
                        <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                        متصل الآن
                      </div>
                    </div>
                    <div className="flex gap-4 text-white/80">
                      <Phone className="w-5 h-5 cursor-pointer hover:text-white transition-colors" />
                      <Video className="w-5 h-5 cursor-pointer hover:text-white transition-colors" />
                      <MoreVertical className="w-5 h-5 cursor-pointer hover:text-white transition-colors" />
                    </div>
                  </div>

                  {/* منطقة المحادثات - Chat Area */}
                  <div className="h-[420px] overflow-y-auto p-4 space-y-3 bg-[#ECE5DD] relative">
                    {/* خلفية الواتساب */}
                    <div 
                      className="absolute inset-0 opacity-5"
                      style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 0c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-48 48c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 0c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7z' fill='%2325D366' fill-opacity='0.2' fill-rule='evenodd'/%3E%3C/svg%3E")`,
                      }}
                    />

                    {/* رسالة واردة 1 - مع أنيميشن */}
                    <div className="flex justify-start animate-message-received">
                      <div className="bg-white rounded-2xl rounded-tr-none px-4 py-2 max-w-[85%] shadow-sm relative">
                        <p className="text-gray-800 text-sm">مرحباً! هل يمكنك إرسال عرض الأسعار؟</p>
                        <span className="text-[10px] text-gray-400 float-left mt-1">10:30 ص</span>
                      </div>
                    </div>

                    {/* رسالة صادرة 1 - مع أنيميشن */}
                    <div className="flex justify-end animate-message-sent">
                      <div className="bg-[#DCF8C6] rounded-2xl rounded-tl-none px-4 py-2 max-w-[85%] shadow-sm">
                        <p className="text-gray-800 text-sm">بالتأكيد! سأرسله لك خلال دقائق</p>
                        <div className="flex items-center justify-end gap-1 mt-1">
                          <span className="text-[10px] text-gray-500">10:31 ص</span>
                          <CheckCheck className="w-3.5 h-3.5 text-[#25D366]" />
                        </div>
                      </div>
                    </div>

                    {/* رسالة صادرة 2 - مع أنيميشن متأخر */}
                    <div className="flex justify-end animate-message-sent delay-150">
                      <div className="bg-[#DCF8C6] rounded-2xl rounded-tl-none px-4 py-2 max-w-[85%] shadow-sm">
                        <p className="text-gray-800 text-sm">تم إرسال عرض الأسعار بنجاح 📎</p>
                        <div className="flex items-center justify-end gap-1 mt-1">
                          <span className="text-[10px] text-gray-500">10:32 ص</span>
                          <CheckCheck className="w-3.5 h-3.5 text-[#25D366]" />
                        </div>
                      </div>
                    </div>

                    {/* مؤشر "يكتب..." - Typing Indicator */}
                    <div className="flex justify-start animate-float">
                      <div className="bg-white rounded-2xl rounded-tr-none px-4 py-2 shadow-sm">
                        <div className="flex gap-1 items-center">
                          <span className="w-2 h-2 bg-[#25D366] rounded-full animate-typing-dot" style={{ animationDelay: '0ms' }}></span>
                          <span className="w-2 h-2 bg-[#25D366] rounded-full animate-typing-dot" style={{ animationDelay: '150ms' }}></span>
                          <span className="w-2 h-2 bg-[#25D366] rounded-full animate-typing-dot" style={{ animationDelay: '300ms' }}></span>
                          <span className="text-xs text-gray-500 mr-2">يكتب...</span>
                        </div>
                      </div>
                    </div>

                    {/* بطاقة الإحصائيات داخل المحادثة */}
                    <div className="mt-4 bg-white/90 backdrop-blur-sm rounded-xl p-3 border border-green-200 shadow-md animate-fade-in-up">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">📨 رسائل مرسلة</span>
                        <span className="text-[#25D366] font-bold">5,678</span>
                      </div>
                      <div className="flex justify-between text-sm mt-2">
                        <span className="text-gray-600">👥 جهات الاتصال</span>
                        <span className="text-[#25D366] font-bold">8</span>
                      </div>
                      <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-[#25D366] rounded-full animate-pulse-glow" style={{ width: '75%' }}></div>
                      </div>
                    </div>
                  </div>

                  {/* شريط الكتابة - Input Bar */}
                  <div className="bg-[#F0F0F0] p-3 flex items-center gap-2">
                    <Smile className="w-6 h-6 text-gray-500 cursor-pointer hover:text-[#25D366] transition-colors" />
                    <Paperclip className="w-5 h-5 text-gray-500 cursor-pointer hover:text-[#25D366] transition-colors" />
                    <div className="flex-1 bg-white rounded-full px-4 py-2 text-sm text-gray-500">
                      اكتب رسالة...
                    </div>
                    <div className="bg-[#25D366] text-white rounded-full p-2 cursor-pointer hover:bg-[#128C7E] transition-all shadow-md animate-pulse-glow">
                      <Send className="w-5 h-5" />
                    </div>
                  </div>
                </div>

                {/* أضواء الموبايل - تأثيرات */}
                <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-32 h-1 bg-black/20 rounded-full"></div>
                <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-24 h-0.5 bg-black/10 rounded-full"></div>
              </div>

              {/* بطاقة عائمة 1 - إحصائيات */}
              <div className="absolute -top-8 -right-8 bg-white rounded-2xl p-4 shadow-xl animate-bounce-slow">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCheck className="w-5 h-5 text-[#25D366]" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">تم الإرسال</p>
                    <p className="text-xs text-gray-500">1,234 رسالة</p>
                  </div>
                </div>
              </div>

              {/* بطاقة عائمة 2 */}
              <div className="absolute -bottom-8 -left-8 bg-white rounded-2xl p-4 shadow-xl animate-bounce-slow" style={{ animationDelay: '1s' }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <Users className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">جهات اتصال</p>
                    <p className="text-xs text-gray-500">5,678 عميل</p>
                  </div>
                </div>
              </div>

              {/* بطاقة عائمة 3 - نسبة النجاح */}
              <div className="absolute top-1/2 -right-12 -translate-y-1/2 bg-white rounded-2xl p-3 shadow-xl animate-float delay-500">
                <div className="text-center">
                  <div className="text-[#25D366] font-bold text-xl">98%</div>
                  <div className="text-xs text-gray-500">نسبة التسليم</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* الموجة السفلية */}
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

// إضافة أيقونة Users
const Users = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);