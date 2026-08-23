// src/lib/push-client.ts
// ─── تنظيف اشتراك الـPush Notifications عند تسجيل الخروج ────────────────────
//
// المشكلة اللي بيحلها الملف ده:
// اشتراك الـPush (endpoint) مرتبط بالمتصفح/الجهاز نفسه، مش بجلسة اليوزر.
// لو أحمد سجّل دخول على جهاز وفعّل إشعارات الجهاز، وبعدين عمل Logout، ومستخدم
// تاني سجّل دخول على نفس الجهاز/المتصفح من غير ما يعمل toggle للإشعارات يدويًا
// — كان اشتراك أحمد القديم (endpoint) لسه شغال في المتصفح ومسجّل في الداتابيز
// على userId بتاعه، فإشعارات أحمد كانت ممكن تفضل توصل للجهاز ده حتى بعد ما
// يطلع من حسابه.
//
// الحل: قبل ما نعمل signOut فعليًا، نلغي اشتراك الـPush بتاع المتصفح خالص
// (browser-level unsubscribe) ونمسح الـrecord بتاعه من السيرفر. كده أي مستخدم
// جديد يسجّل دخول على نفس الجهاز، هيحتاج يعمل subscribe جديد بنفسه (endpoint
// جديد يتربط بحسابه هو بس).
//
// ملحوظة: الملف ده جزء من منطق التطبيق (dashboard) بعد تسجيل الدخول — مالوش
// أي علاقة باللاندينج بيدج العامة (src/app/[locale], src/components/LandingPage).

/**
 * يحاول يلغي اشتراك الـPush الحالي على الجهاز/المتصفح ده — على مستوى المتصفح
 * (PushManager.unsubscribe) وعلى مستوى السيرفر (حذف الـPushSubscription record).
 *
 * آمن للاستدعاء دايمًا: بيلتقط أي error من غير ما يوقف تنفيذ الـlogout —
 * حتى لو الجلسة خلصت بالفعل (401) أو المتصفح مش بيدعم Push أصلاً.
 */
export async function unsubscribePushOnThisDevice(): Promise<void> {
  try {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) return;

    const sub = await reg.pushManager.getSubscription();
    if (!sub) return;

    const endpoint = sub.endpoint;

    // 1) امسح الـrecord من السيرفر (best-effort — لو الجلسة خلصت هيرجع 401
    //    وده مش مشكلة، لأن هنلغي الاشتراك من المتصفح في الخطوة الجاية على أي حال)
    try {
      await fetch("/api/push/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint }),
      });
    } catch {
      /* شبكة/سيرفر مش متاح — نكمل نلغي محليًا برضو */
    }

    // 2) الأهم: إلغاء الاشتراك من المتصفح نفسه، عشان الـendpoint ده يبقى
    //    منتهي فعليًا ومايفضلش يستقبل push حتى لو السيرفر معملوش delete
    await sub.unsubscribe();
  } catch {
    /* أي خطأ هنا متوقعشي يمنع تسجيل الخروج */
  }
}

/**
 * Wrapper حوالين next-auth's signOut(): بيلغي اشتراك الـPush على الجهاز ده
 * الأول، وبعدين يعمل signOut عادي بنفس الـoptions.
 * استخدمها بدل ما تستدعي signOut() مباشرة من أي مكان جوه الـdashboard.
 */
export async function signOutWithPushCleanup(
  signOutFn: (options?: { callbackUrl?: string; redirect?: boolean }) => Promise<any>,
  options?: { callbackUrl?: string; redirect?: boolean }
): Promise<void> {
  await unsubscribePushOnThisDevice();
  await signOutFn(options);
}
