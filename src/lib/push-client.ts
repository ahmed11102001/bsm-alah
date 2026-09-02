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
 * فحص ما إذا كان هناك اشتراك Push فعلي وصالح على الجهاز ومربوط بالمستخدم الحالي في الـDB.
 * لا يعتمد فقط على Notification.permission بل يتحقق من الاشتراك الحقيقي في الـDB.
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
    if (!reg.pushManager) return false;

    const sub = await reg.pushManager.getSubscription();
    if (!sub) return false;

    // التحقق من أن الـ endpoint مسجل في الـ DB ومربوط بالمستخدم الحالي
    const res = await fetch(`/api/push/subscribe?endpoint=${encodeURIComponent(sub.endpoint)}`);
    if (!res.ok) return false;

    const data = await res.json();
    return !!data.enabled;
  } catch {
    return false;
  }
}

/**
 * عند تسجيل الدخول أو تحميل لوحة التحكم:
 * إذا كان إذن المتصفح مسموحًا (Notification.permission === 'granted'):
 * 1. يتحقق من وجود PushSubscription على الجهاز
 * 2. إذا لم يكن موجودًا (أو منتهيًا)، يعيد إنشاء الاشتراك تلقائيًا
 * 3. يسجل/يحدث الاشتراك في الـDB ويربطه بالمستخدم الحالي فورًا
 * 4. يرجع boolean يعبر عما إذا كان الاشتراك فعالًا ومسجلاً للمستخدم الحالي
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
    if (!vapidKey) return false;

    // تسجيل الـService Worker وضمان جاهزيته
    await navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    const reg = await navigator.serviceWorker.ready;
    if (!reg.pushManager) return false;

    // 1. فحص الاشتراك الحالي على الجهاز
    let sub = await reg.pushManager.getSubscription();

    // 2. إذا لم يكن هناك اشتراك على الجهاز، نعيد إنشاء الاشتراك تلقائيًا
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

    if (!sub) return false;

    const json = sub.toJSON();
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
      return false;
    }

    // 3. ربط وتحديث الاشتراك في الداتابيز بحساب المستخدم الحالي
    const res = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint: json.endpoint,
        keys: json.keys,
      }),
    });

    return res.ok;
  } catch (err) {
    console.error("[PUSH] Sync push subscription on login failed:", err);
    return false;
  }
}

/**
 * إلغاء اشتراك الـPush يدوياً عند رغبة المستخدم الصريحة (مثل toggle off في الإعدادات)
 */
export async function unsubscribePushOnThisDevice(): Promise<void> {
  try {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) return;

    const sub = await reg.pushManager.getSubscription();
    if (!sub) return;

    const endpoint = sub.endpoint;

    try {
      await fetch("/api/push/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint }),
      });
    } catch {
      /* network error */
    }

    await sub.unsubscribe();
  } catch {
    /* ignore error */
  }
}

/**
 * تسجيل الخروج (signOut):
 * - إذن المتصفح Notification.permission يظل كما هو.
 * - لا يتم حذف أو إلغاء اشتراك الـPushSubscription من المتصفح/الجهاز لمجرد تسجيل الخروج.
 * - عند تسجيل الدخول مجددًا، يقوم syncPushSubscriptionOnLogin بربط الجهاز بالمستخدم الصحيح تلقائيًا.
 */
export async function signOutWithPushCleanup(
  signOutFn: (options?: { callbackUrl?: string; redirect?: boolean }) => Promise<any>,
  options?: { callbackUrl?: string; redirect?: boolean }
): Promise<void> {
  // لا نحذف PushSubscription من الجهاز عند تسجيل الخروج
  await signOutFn(options);
}
