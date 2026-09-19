// src/app/api/email/unsubscribe/route.ts
// ─── Unsubscribe عام — بدون auth ─────────────────────────────────────────────
// المستخدم بيفتحه من جوه إيميل، مش هيكون عامل login.
// الرابط الجديد يستخدم token موقّع بـ HMAC (`?t=...`) — مش الـ Contact ID
// الخام — عشان محدش يقدر يتلاعب في IDs ويلغي اشتراك contacts تانية.
// `?c=<contactId>` القديم لسه مدعوم مؤقتًا للإيميلات اللي اتبعتت قبل التوقيع.
// مفيش أي معلومة حساسة عن الحساب بترجع في الرد غير رسالة التأكيد.

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyUnsubscribeToken } from "@/lib/email-marketing/unsubscribe-token";

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const token = searchParams.get("t");
  // Legacy fallback للإيميلات المرسلة قبل التوقيع — يُزال بعد انتهاء صلاحيتها.
  const legacyContactId = searchParams.get("c");

  let contactId: string | null = null;
  if (token) {
    contactId = verifyUnsubscribeToken(token);
  } else if (legacyContactId) {
    contactId = legacyContactId;
  }

  if (!contactId) {
    return NextResponse.redirect(new URL("/unsubscribe?status=invalid", origin));
  }

  try {
    const contact = await prisma.contact.findUnique({
      where: { id: contactId },
      select: { id: true },
    });

    if (!contact) {
      return NextResponse.redirect(new URL("/unsubscribe?status=invalid", origin));
    }

    await prisma.contact.update({
      where: { id: contactId },
      data: { emailStatus: "UNSUBSCRIBED" },
    });

    return NextResponse.redirect(new URL("/unsubscribe?status=success", origin));
  } catch (err) {
    console.error("[api/email/unsubscribe]:", err);
    return NextResponse.redirect(new URL("/unsubscribe?status=error", origin));
  }
}
