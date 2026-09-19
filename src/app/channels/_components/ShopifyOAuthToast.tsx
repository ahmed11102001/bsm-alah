"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { useLanguage } from "@/lib/language-context";

// ─── نتيجة ربط Shopify التلقائي (OAuth callback) — toast مرة واحدة وتنظيف الـURL ───
// نفس منطق dashboard/layout (مقروء من window.location عمدًا لتفادي Suspense boundary).
// الـ Toaster عام من ClientProvider في الـ root layout.
export default function ShopifyOAuthToast() {
  const pathname = usePathname();
  const router = useRouter();
  const { locale } = useLanguage();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connected = params.get("shopify_connected");
    const err = params.get("shopify_error");
    if (!connected && !err) return;
    if (connected) {
      toast.success(locale === "ar" ? "تم ربط متجر Shopify تلقائيًا ✅" : "Shopify store connected automatically ✅");
    } else {
      const messages: Record<string, string> = locale === "ar" ? {
        missing_params: "ناقص بيانات الرجوع من Shopify — حاول تاني",
        invalid_shop: "دومين المتجر غير صالح",
        invalid_state: "انتهت صلاحية جلسة الربط — حاول تاني",
        user_not_found: "الحساب غير موجود",
        token_exchange_failed: "فشل استبدال الكود بتوكن — حاول تاني",
        no_token: "Shopify مرجعش توكن — حاول تاني",
        shop_taken: "المتجر مربوط بحساب آخر بالفعل",
        oauth_not_configured: "الربط التلقائي غير مفعّل حاليًا",
      } : {
        missing_params: "Missing return data from Shopify — try again",
        invalid_shop: "Invalid store domain",
        invalid_state: "Connect session expired — try again",
        user_not_found: "Account not found",
        token_exchange_failed: "Failed to exchange code for token — try again",
        no_token: "Shopify returned no token — try again",
        shop_taken: "Store is already connected to another account",
        oauth_not_configured: "Automatic connect is currently disabled",
      };
      toast.error(messages[err ?? ""] ?? (locale === "ar" ? "فشل الربط التلقائي — حاول تاني" : "Automatic connect failed — try again"));
    }
    params.delete("shopify_connected");
    params.delete("shopify_error");
    const rest = params.toString();
    router.replace(rest ? `${pathname}?${rest}` : pathname);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
