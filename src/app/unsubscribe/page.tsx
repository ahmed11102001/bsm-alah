// src/app/unsubscribe/page.tsx
// صفحة عامة بالكامل — من غير تسجيل دخول، من غير أي معلومة حساسة عن الحساب.

import { CheckCircle2, XCircle, AlertTriangle } from "lucide-react";

export const metadata = {
  title: "إلغاء الاشتراك | WANI",
};

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;

  const content = {
    success: {
      icon: <CheckCircle2 className="h-14 w-14 text-emerald-400" />,
      title: "تم إلغاء الاشتراك بنجاح",
      body: "مش هتستقبل رسايل تسويقية تانية من الجهة دي على الإيميل ده.",
    },
    invalid: {
      icon: <AlertTriangle className="h-14 w-14 text-amber-400" />,
      title: "الرابط غير صالح",
      body: "الرابط ده مش صحيح أو منتهي. لو لسه بتستقبل رسايل مش عايزها، تواصل مع الجهة اللي بعتتلك مباشرة.",
    },
    error: {
      icon: <XCircle className="h-14 w-14 text-red-400" />,
      title: "حدث خطأ",
      body: "حصل خطأ غير متوقع أثناء تنفيذ طلبك. جرّب تاني بعد شوية.",
    },
  } as const;

  const view = content[(status as keyof typeof content) || "error"] || content.error;

  return (
    <div
      className="flex min-h-screen min-h-[100dvh] flex-col items-center justify-center bg-[#04070f] px-6 text-center"
      dir="rtl"
    >
      <div className="flex w-full max-w-sm flex-col items-center gap-4 rounded-3xl border border-white/10 bg-white/[0.03] p-8 backdrop-blur-md">
        {view.icon}
        <h1 className="text-lg font-bold text-white">{view.title}</h1>
        <p className="text-sm text-white/60">{view.body}</p>
      </div>
    </div>
  );
}
