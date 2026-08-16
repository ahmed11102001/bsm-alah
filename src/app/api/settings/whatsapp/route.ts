import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { encryptToken } from "@/lib/crypto";
import { requirePermission } from "@/lib/permissions";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const denied = requirePermission(session, "WHATSAPP_SETTINGS");
    if (denied) return denied;
    const ownerId = ((session!.user as any).parentId as string | null) ?? (session!.user as any).id;

    const { accessToken, phoneNumberId, wabaId } = await req.json();

    if (!accessToken || !phoneNumberId || !wabaId) {
      return NextResponse.json({ error: "جميع الحقول مطلوبة" }, { status: 400 });
    }

    // تشفير الـ token قبل الحفظ في DB
    const encryptedToken = encryptToken(accessToken);

    // حفظ أو تحديث بيانات واتساب الخاص باليوزر
    await prisma.whatsAppAccount.upsert({
      where: { userId: ownerId },
      update: {
        accessToken: encryptedToken,
        phoneNumberId,
        wabaId,
        tokenStatus: "UNKNOWN",
        tokenExpiresAt: null,
        lastTokenCheckAt: null,
        tokenDataAccessExpiresAt: null,
        tokenWarning7SentAt: null,
        tokenWarning3SentAt: null,
        tokenWarning1SentAt: null,
        tokenExpiredNotifiedAt: null,
        tokenInvalidNotifiedAt: null,
      },
      create: {
        userId: ownerId,
        accessToken: encryptedToken,
        phoneNumberId,
        wabaId,
      },
    });

    // لا نرجع الـ accessToken في الـ response نهائياً
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);
    const denied = requirePermission(session, "WHATSAPP_SETTINGS");
    if (denied) return denied;
    const ownerId =
      ((session!.user as any).parentId as string | null) ?? (session!.user as any).id;

    // ── 1. وقّف الـ campaigns الشغّالة أو المجدولة ───────────────────────────
    // الـ campaign محتاجة access token — لو مفيش ربط الإرسال هيفشل
    // نوقّفها بـ "failed" عشان اليوزر يشوفها ويعرف السبب
    const stoppedCampaigns = await prisma.campaign.updateMany({
      where: {
        userId: ownerId,
        status: { in: ["running", "scheduled"] },
      },
      data: { status: "failed" },
    });

    // ── 2. وقّف الرسائل المنتظرة في الـ queue ────────────────────────────────
    // بدل ما يفضلوا في queue وكل مرة يحاولوا يتبعتوا ويفشلوا
    const stoppedQueue = await prisma.messageQueue.updateMany({
      where: {
        userId: ownerId,
        status: "pending",
      },
      data: { status: "failed" },
    });

    // ── 3. احذف الـ WhatsAppAccount من DB ────────────────────────────────────
    // القوالب بتفضل — هي بيانات تجارية للمستخدم مش credentials
    // لو ربط تاني بعدين يعمل sync وهيرجعوا
    const deleted = await prisma.whatsAppAccount.deleteMany({
      where: { userId: ownerId },
    });

    console.log(
      `[DISCONNECT] userId=${ownerId} — deleted=${deleted.count} account, ` +
      `stopped ${stoppedCampaigns.count} campaigns, ${stoppedQueue.count} queued messages`,
    );

    return NextResponse.json({
      success: true,
      stoppedCampaigns: stoppedCampaigns.count,
      stoppedQueue:     stoppedQueue.count,
    });
  } catch (error: any) {
    console.error("[DISCONNECT] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
