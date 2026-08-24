// Service Worker — WANI Push Notifications
// يستقبل Push events ويعرض إشعارات النظام

const ICON = "/app.png";
const DEFAULT_URL = "/dashboard";

// ── Install — فعّل نسخة الـSW الجديدة فورًا، من غير ما تستنى كل التابات تتقفل ──
// افتراضيًا، لما تنزل نسخة جديدة من sw.js، المتصفح بيسيبها "waiting" لحد ما
// كل التابات المفتوحة على الموقع تتقفل — ده معناه اليوزر ممكن يفضل شغال بمنطق
// push/notificationclick قديم لأيام لو مقفلش المتصفح خالص. skipWaiting() هنا
// بيخلي النسخة الجديدة تتفعّل على طول أول ما توصل.
self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

// ── Push Event Handler ──────────────────────────────────────────────────────
self.addEventListener("push", (event) => {
  let data = { title: "WANI", body: "لديك إشعار جديد", url: DEFAULT_URL };

  try {
    if (event.data) {
      const parsed = event.data.json();
      data = { ...data, ...parsed };
    }
  } catch {
    // fallback to text
    if (event.data) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || ICON,
    badge: ICON,
    dir: "rtl",
    lang: "ar",
    vibrate: [200, 100, 200],
    data: { url: data.url || DEFAULT_URL },
    actions: [
      { action: "open", title: "فتح" },
      { action: "dismiss", title: "تجاهل" },
    ],
    tag: data.tag || "wani-" + Date.now(),
    renotify: true,
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// ── Notification Click Handler ──────────────────────────────────────────────
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "dismiss") return;

  const targetUrl = event.notification.data?.url || DEFAULT_URL;

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        // لو فيه تاب مفتوح بالفعل — نفتح عليه
        for (const client of windowClients) {
          if (client.url.includes("/dashboard") && "focus" in client) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
        // لو مفيش — نفتح تاب جديد
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
  );
});

// ── Activate — تفعيل فوري على كل التابات المفتوحة حاليًا ───────────────────
// clients.claim() بيخلي الـSW الجديد ده يتحكم في أي تاب مفتوح بالفعل على طول
// (مش بس التابات الجديدة اللي هتتفتح بعد كده) — مكمّل لـskipWaiting() فوق،
// عشان أي تحديث في منطق push/notificationclick يوصل لكل الأجهزة بأسرع وقت
// ممكن، من غير ما اليوزر يحتاج يقفل المتصفح أو يعمل uninstall/reinstall للـPWA.
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});