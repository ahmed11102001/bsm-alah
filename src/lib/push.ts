// src/lib/push.ts
// ─── Web Push Helper — إرسال Push Notifications ─────────────────────────────

import webpush from "web-push";
import prisma from "@/lib/prisma";

// ── Configure VAPID ─────────────────────────────────────────────────────────
const VAPID_PUBLIC  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY ?? "";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT ?? "mailto:support@whatspro.com";

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
}

// ── Types ───────────────────────────────────────────────────────────────────
interface PushPayload {
  title: string;
  body:  string;
  url?:  string;
  icon?: string;
  tag?:  string;
}

// ── Send Push to all devices of a user ──────────────────────────────────────
export async function sendPushToUser(userId: string, payload: PushPayload) {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    console.warn("[PUSH] VAPID keys not configured — skipping push");
    return;
  }

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId },
  });

  if (subscriptions.length === 0) return;

  const pushPayload = JSON.stringify(payload);
  const staleIds: string[] = [];

  await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          pushPayload,
          { TTL: 86400 } // 24 hours
        );
      } catch (err: any) {
        const status = err?.statusCode ?? err?.status;
        // 410 Gone / 404 Not Found → الاشتراك مش صالح
        if (status === 410 || status === 404) {
          staleIds.push(sub.id);
        } else {
          console.error(`[PUSH] Failed for endpoint ${sub.endpoint.slice(0, 50)}... :`, err?.message);
        }
      }
    })
  );

  // حذف الاشتراكات المنتهية
  if (staleIds.length > 0) {
    await prisma.pushSubscription.deleteMany({
      where: { id: { in: staleIds } },
    });
    console.info(`[PUSH] Cleaned up ${staleIds.length} stale subscriptions for user ${userId}`);
  }
}
