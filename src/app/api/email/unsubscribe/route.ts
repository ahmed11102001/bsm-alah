// src/app/api/email/unsubscribe/route.ts
// ─── Unsubscribe عام — بدون auth ─────────────────────────────────────────────
// المستخدم بيفتحه من جوه إيميل، مش هيكون عامل login. بيتأكد بس إن الـcontactId
// موجود، يحدّث emailStatus، ويوديه لصفحة تأكيد عامة. مفيش أي معلومة حساسة
// عن الحساب بترجع في الرد غير رسالة التأكيد.

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const contactId = searchParams.get("c");

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
