// src/app/api/onboarding/route.ts
// بيحفظ رقم الواتساب للمستخدم الجديد من Google

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const { phone } = await req.json();

  // تحقق من الصيغة
  const cleaned = String(phone ?? "").replace(/\s|-/g, "");
  if (!/^2\d{11}$/.test(cleaned)) {
    return NextResponse.json({ error: "رقم هاتف غير صحيح" }, { status: 400 });
  }

  // تأكد إن الرقم مش مستخدم من حساب تاني
  const existing = await prisma.user.findFirst({
    where: {
      phone: cleaned,
      NOT: { id: session.user.id },
    },
  });
  if (existing) {
    return NextResponse.json({ error: "هذا الرقم مستخدم بالفعل" }, { status: 409 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data:  { phone: cleaned },
  });

  return NextResponse.json({ ok: true });
}