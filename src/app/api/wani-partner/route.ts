// src/app/api/wani-partner/route.ts
// Endpoint عام (لأي يوزر مسجّل دخول) بيرجّع كروت "WANI Partner" المعتمدة والمفعّلة
// بس (status = approved, active = true) — ده اللي بيتعرض في كارت الداشبورد الرئيسي
// (src/app/dashboard/page.tsx) بالتدوير. إدارة الكروت (قبول/رفض/ترتيب) في
// /api/admin/wani-partner، وكارت اليوزر الخاص بيه في /api/wani-partner/mine.
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const cards = await prisma.waniPartnerCard.findMany({
    where: { status: "approved", active: true },
    orderBy: [{ order: "asc" }],
    select: {
      id: true,
      template: true,
      brandName: true,
      title: true,
      tagline: true,
      ctaText: true,
      ctaLink: true,
      image: true,
    },
  });

  return NextResponse.json(cards);
}