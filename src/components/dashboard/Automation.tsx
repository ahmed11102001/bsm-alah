"use client";

import { Zap, Clock, MessageSquare, Users, Bell, Repeat } from "lucide-react";

const features = [
  { icon: <MessageSquare className="w-5 h-5" />, title: "ردود تلقائية", desc: "رد فوري على رسائل العملاء بناءً على كلمات مفتاحية أو أوقات محددة" },
  { icon: <Users className="w-5 h-5" />,        title: "ترحيب بالجدد",  desc: "إرسال رسالة ترحيب تلقائية لكل عميل جديد يتواصل معك لأول مرة" },
  { icon: <Clock className="w-5 h-5" />,        title: "تذكيرات مجدولة", desc: "إرسال تذكيرات بالمواعيد والعروض في أوقات مبرمجة مسبقاً" },
  { icon: <Bell className="w-5 h-5" />,         title: "إشعارات الأحداث", desc: "تشغيل رسائل تلقائية عند أحداث معينة كعيد الميلاد أو انتهاء الاشتراك" },
  { icon: <Repeat className="w-5 h-5" />,       title: "متابعة العملاء",  desc: "إعادة التواصل مع العملاء الغائبين بعد فترة زمنية محددة" },
  { icon: <Zap className="w-5 h-5" />,          title: "سير عمل مخصص",   desc: "بناء تسلسلات رسائل متكاملة مرتبطة بسلوك العميل واستجاباته" },
];

export default function Automation() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-8 text-center" dir="rtl">

      {/* Icon */}
      <div className="w-20 h-20 rounded-3xl bg-green-50 flex items-center justify-center mb-6">
        <Zap className="w-10 h-10 text-green-500" />
      </div>

      {/* Coming soon */}
      <span className="text-xs font-semibold tracking-widest text-green-600 bg-green-50 px-4 py-1.5 rounded-full mb-4">
        قريباً
      </span>

      <h1 className="text-3xl font-bold text-gray-900 mb-3">الأتمتة الذكية</h1>
      <p className="text-gray-500 text-base max-w-md leading-relaxed mb-16">
        نعمل على بناء محرك أتمتة قوي يتيح لك إرسال الرسائل الصحيحة، للشخص الصحيح، في الوقت الصحيح — تلقائياً وبدون تدخل يدوي.
      </p>

      {/* Features grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-3xl">
        {features.map((f) => (
          <div
            key={f.title}
            className="flex items-start gap-3 bg-white border border-gray-100 rounded-2xl p-4 text-right shadow-sm"
          >
            <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 flex-shrink-0 mt-0.5">
              {f.icon}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-0.5">{f.title}</p>
              <p className="text-xs text-gray-400 leading-relaxed">{f.desc}</p>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}