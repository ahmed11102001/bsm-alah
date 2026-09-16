// src/lib/dev-notifications.ts
// ══════════════════════════════════════════════════════════════════════════════
//  إشعارات البورتال — نقطة مركزية واحدة لإنشاء إشعارات المطور/الأونر.
//
//  - fire-and-forget آمن: لا يرمي أبدًا (يفشل بصمت مع log) حتى لا يكسر أي flow.
//  - dedup اختياري: يمنع تكرار نفس الإشعار غير المقروء خلال نافذة زمنية.
//  - كل الأنواع هنا يجب أن يكون لها مقابل في NotificationBell (TYPE_CONFIG).
// ══════════════════════════════════════════════════════════════════════════════

import prisma from "@/lib/prisma";

export type DevNotificationType =
  | "META_UPDATE"
  | "BILLING"
  | "SECURITY"
  | "SYSTEM"
  | "TRIAL_WARNING"
  | "TRIAL_EXPIRING"
  | "PLAN_EXPIRING_SOON"
  | "PLAN_EXPIRED"
  | "TOPUP_APPROVED"
  | "TOPUP_REJECTED"
  | "BALANCE_LOW"
  | "DEBT_CLEARED"
  | "API_KEY"
  | "META_CONNECTION"
  | "TRANSFER";

export interface DevNotifyInput {
  type: DevNotificationType;
  title: string;
  message: string;
  link?: string | null;
  /** منع التكرار: لا ينشئ لو يوجد نفس النوع+الرابط غير مقروء خلال الساعات المحددة */
  dedupHours?: number;
}

export async function notifyDeveloper(
  developerId: string,
  input: DevNotifyInput
): Promise<void> {
  try {
    if (!developerId) return;
    if (input.dedupHours && input.dedupHours > 0) {
      const since = new Date(Date.now() - input.dedupHours * 3600_000);
      const existing = await prisma.developerNotification.findFirst({
        where: {
          developerId,
          type: input.type as never,
          link: input.link ?? null,
          isRead: false,
          createdAt: { gte: since },
        },
        select: { id: true },
      });
      if (existing) return;
    }
    await prisma.developerNotification.create({
      data: {
        developerId,
        type: input.type as never,
        title: input.title,
        message: input.message,
        link: input.link ?? null,
      },
    });
  } catch (err) {
    console.error("[DevNotify] failed:", err);
  }
}

/** إشعار لطرفي المشروع معًا (المطور + الأونر إن وجد) */
export async function notifyProjectParties(
  project: { developerId: string; ownerId: string | null },
  input: DevNotifyInput
): Promise<void> {
  await notifyDeveloper(project.developerId, input);
  if (project.ownerId && project.ownerId !== project.developerId) {
    await notifyDeveloper(project.ownerId, input);
  }
}
