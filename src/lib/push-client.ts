// src/lib/push-client.ts
// ─── إدارة اشتراك الـPush Notifications في المتصفح والـAuth ──────────────────

/**
 * تحويل مفتاح VAPID من Base64 إلى Uint8Array
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

/**
 * فحص ما إذا كان هناك اشتراك Push فعلي وصالح على الجهاز
 * ومربوط بالمستخدم الحالي في الـDB.
 */
export async function checkPushSubscriptionStatus(): Promise<boolean> {
  try {
    if (
      typeof window === "undefined" ||
      !("Notification" in window) ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window)
    ) {
      return false;
    }

    if (Notification.permission !== "granted") {
      return false;
    }

    const reg = await navigator.serviceWorker.ready;

    if (!reg.pushManager) {
      return false;
    }

    const sub = await reg.pushManager.getSubscription();

    if (!sub) {
      return false;
    }

    const res = await fetch(
      `/api/push/subscribe?endpoint=${encodeURIComponent(sub.endpoint)}`
    );

    if (!res.ok) {
      return false;
    }

    const data = await res.json();

    return !!data.enabled;
  } catch {
    return false;
  }
}

/**
 * مزامنة Push Subscription عند تسجيل الدخول أو تحميل لوحة التحكم.
 *
 * إذا كان Permission = granted:
 * 1. نتأكد من وجود Service Worker.
 * 2. نحصل على الاشتراك الموجود على الجهاز.
 * 3. إذا لم يوجد، ننشئ اشتراكًا جديدًا.
 * 4. نسجل الاشتراك في DB للمستخدم الحالي.
 *
 * مهم:
 * لا نطلب Permission جديد هنا؛ هذه الدالة تعمل فقط عندما يكون
 * permission بالفعل granted.
 */
export async function syncPushSubscriptionOnLogin(): Promise<boolean> {
  try {
    if (
      typeof window === "undefined" ||
      !("Notification" in window) ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window)
    ) {
      return false;
    }

    if (Notification.permission !== "granted") {
      return false;
    }

    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

    if (!vapidKey) {
      console.warn("[PUSH] Missing NEXT_PUBLIC_VAPID_PUBLIC_KEY");
      return false;
    }

    // تسجيل الـService Worker وضمان جاهزيته
    await navigator.serviceWorker.register("/sw.js").catch(() => undefined);

    const reg = await navigator.serviceWorker.ready;

    if (!reg.pushManager) {
      return false;
    }

    // الحصول على الاشتراك الموجود على الجهاز
    let sub = await reg.pushManager.getSubscription();

    // إذا لم يوجد اشتراك، أنشئ واحدًا جديدًا
    if (!sub) {
      try {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey) as any,
        });
      } catch (subErr) {
        console.warn("[PUSH] Auto-resubscribe error on login:", subErr);
        return false;
      }
    }

    if (!sub) {
      return false;
    }

    const json = sub.toJSON();

    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
      return false;
    }

    // ربط الاشتراك بالمستخدم الحالي.
    // الـAPI مسؤول عن إنشاء/تحديث السجل وربطه بالـUser الحالي.
    const res = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        endpoint: json.endpoint,
        keys: json.keys,
      }),
    });

    if (!res.ok) {
      console.warn("[PUSH] Failed to sync subscription with server:", res.status);
      return false;
    }

    return true;
  } catch (err) {
    console.error("[PUSH] Sync push subscription on login failed:", err);
    return false;
  }
}

/**
 * إلغاء Push بالكامل من هذا الجهاز.
 *
 * يُستخدم فقط عندما يختار المستخدم صراحةً إيقاف الإشعارات.
 *
 * هنا يتم:
 * 1. حذف الاشتراك من DB.
 * 2. إلغاء PushSubscription من المتصفح.
 */
export async function unsubscribePushOnThisDevice(): Promise<void> {
  try {
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window)
    ) {
      return;
    }

    const reg = await navigator.serviceWorker.getRegistration();

    if (!reg) {
      return;
    }

    const sub = await reg.pushManager.getSubscription();

    if (!sub) {
      return;
    }

    const endpoint = sub.endpoint;

    try {
      await fetch("/api/push/unsubscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          endpoint,
        }),
      });
    } catch {
      // لا نوقف العملية إذا حدث خطأ شبكة.
    }

    // هنا فقط يتم إلغاء الاشتراك من المتصفح،
    // لأن المستخدم اختار إيقاف الإشعارات فعليًا.
    await sub.unsubscribe();
  } catch {
    // ignore
  }
}

/**
 * فصل Push Subscription عن المستخدم الحالي عند Logout
 * بدون إلغاء الاشتراك من الجهاز.
 *
 * الفرق عن unsubscribePushOnThisDevice():
 *
 * Logout:
 *   DB association → تُحذف
 *   Browser subscription → يظل موجودًا
 *
 * Turn Off Notifications:
 *   DB association → تُحذف
 *   Browser subscription → يُلغى
 *
 * عند Login لاحقًا:
 *   syncPushSubscriptionOnLogin()
 *   يعيد ربط نفس الـsubscription بالمستخدم الحالي.
 */
export async function detachPushSubscriptionOnLogout(): Promise<void> {
  try {
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window)
    ) {
      return;
    }

    const reg = await navigator.serviceWorker.getRegistration();

    if (!reg) {
      return;
    }

    const sub = await reg.pushManager.getSubscription();

    if (!sub) {
      return;
    }

    // نحذف الربط من DB فقط.
    // لا نستدعي sub.unsubscribe().
    try {
      await fetch("/api/push/unsubscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          endpoint: sub.endpoint,
        }),
        keepalive: true,
      });
    } catch {
      // لا نمنع Logout بسبب خطأ شبكة.
    }
  } catch {
    // لا نمنع Logout بسبب Push.
  }
}

/**
 * تسجيل الخروج:
 *
 * - Notification.permission يظل كما هو.
 * - PushSubscription يظل موجودًا على الجهاز.
 * - يتم فقط فصل الاشتراك عن المستخدم الحالي في DB.
 * - عند Login مرة أخرى، يتم إعادة ربطه تلقائيًا بالمستخدم الحالي.
 */
export async function signOutWithPushCleanup(
  signOutFn: (
    options?: {
      callbackUrl?: string;
      redirect?: boolean;
    }
  ) => Promise<any>,
  options?: {
    callbackUrl?: string;
    redirect?: boolean;
  }
): Promise<void> {
  // افصل الاشتراك عن الحساب الحالي فقط.
  // لا تلغِ الاشتراك من الجهاز.
  await detachPushSubscriptionOnLogout();

  // بعدها نفذ Logout الطبيعي.
  await signOutFn(options);
}