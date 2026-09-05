// ─── usePixel hook ────────────────────────────────────────────────────────────
// استخدمه في أي component عشان تبعت event لـ Meta Pixel
//
// مثال:
//   const { track } = usePixel();
//   track("InitiateCheckout", { value: 499, currency: "EGP" });

export function usePixel() {
  const track = (event: PixelEvent, data?: PixelData) => {
    if (typeof window === "undefined") return;
    // Meta Pixel (client-side)
    if (window.fbq) window.fbq("track", event, data ?? {});

    // OpenAI (ChatGPT) Ads Pixel — بنفس الاستدعاء، بالخريطة الرسمية من اللوحة
    // ملحوظة: Purchase مستثناة عمدًا — بتتبعت سيرفر-سايد فقط عبر
    // sendOpenAIPurchaseEvent (Conversions API)، مفيش نسخة Pixel ليها
    if (window.oaiq && event !== "Purchase") {
      const mapped = OPENAI_EVENT_MAP[event as Exclude<PixelEvent, "Purchase">];
      if (mapped) window.oaiq("measure", mapped.name, { type: mapped.type });
    }
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

// ─── خريطة أحداث OpenAI Ads (الأسماء والـ type الرسمية من اللوحة) ───────────
// AddPaymentInfo و Search مالهومش أحداث مخصصة في الحساب — بيتحسبوا ضمن
// أقرب مكافئ بدل ما يتجاهلوا. لو اتعملت أحداث مخصصة ليهم بعدين، حدّث الخريطة.
const OPENAI_EVENT_MAP: Record<
  Exclude<PixelEvent, "Purchase">,
  { name: string; type: string }
> = {
  PageView:             { name: "page_viewed",     type: "contents" },
  ViewContent:         { name: "contents_viewed", type: "contents" },
  InitiateCheckout:    { name: "checkout_started", type: "contents" },
  CompleteRegistration:{ name: "trial_started",    type: "plan_enrollment" },
  Lead:                { name: "lead_created",     type: "customer_action" },
  AddPaymentInfo:      { name: "checkout_started", type: "contents" },
  Search:              { name: "contents_viewed",  type: "contents" },
};

// ─── TypeScript declaration merge ─────────────────────────────────────────────
declare global {
  interface Window {
    fbq: (...args: any[]) => void;
    oaiq?: (...args: any[]) => void;
  }
}