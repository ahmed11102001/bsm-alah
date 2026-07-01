// Service Worker — WhatsPro Push Notifications
// يستقبل Push events ويعرض إشعارات النظام

const ICON = "/favicon.jpg";
const DEFAULT_URL = "/dashboard";

// ── Push Event Handler ──────────────────────────────────────────────────────
self.addEventListener("push", (event) => {
  let data = { title: "WhatsPro", body: "لديك إشعار جديد", url: DEFAULT_URL };

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
    tag: data.tag || "whatspro-" + Date.now(),
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

// ── Activate — تنظيف caches قديمة (مستقبلي) ────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});
