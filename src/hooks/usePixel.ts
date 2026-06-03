// ─── usePixel hook ────────────────────────────────────────────────────────────
// استخدمه في أي component عشان تبعت event لـ Meta Pixel
//
// مثال:
//   const { track } = usePixel();
//   track("InitiateCheckout", { value: 499, currency: "EGP" });

export function usePixel() {
  const track = (event: PixelEvent, data?: PixelData) => {
    if (typeof window === "undefined" || !window.fbq) return;
    window.fbq("track", event, data ?? {});
  };

  return { track };
}

// ─── الـ Events المدعومة ──────────────────────────────────────────────────────
export type PixelEvent =
  | "PageView"             // تلقائي — لا تستدعيه يدوياً
  | "ViewContent"          // شاف الـ Landing / Pricing
  | "InitiateCheckout"     // ضغط "ابدأ الآن" أو دخل /checkout
  | "AddPaymentInfo"       // بدأ يكتب بيانات البطاقة
  | "Purchase"             // إتم الدفع فعلاً
  | "CompleteRegistration" // سجّل حساب جديد
  | "Lead"                 // ملأ فورم تواصل / طلب عرض
  | "Search";              // بحث داخل الموقع

export interface PixelData {
  value?       : number;   // القيمة بالجنيه
  currency?    : string;   // "EGP" دايماً
  content_name?: string;   // اسم الباقة مثلاً "Professional"
  content_ids? : string[]; // ["pro"]
  content_type?: string;   // "product"
  num_items?   : number;
  [key: string]: any;
}

// ─── TypeScript declaration merge ─────────────────────────────────────────────
declare global {
  interface Window {
    fbq: (...args: any[]) => void;
  }
}