// src/app/api/wani-partner/route.ts
// جلب كروت "WANI Partner" المفعّلة عشان تتعرض بالتدوير في الداشبورد
// (src/app/dashboard/page.tsx → WaniPartnerCard). أي مستخدم مسجّل دخول يقدر
// يقرأ، لكن التعديل مقصور على الأدمن من /api/admin/wani-partner.
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const cards = await prisma.waniPartnerCard.findMany({
    where: { active: true },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    select: {
      id: true, template: true, brandName: true, title: true,
      tagline: true, ctaText: true, ctaLink: true, image: true,
    },
  });

  return NextResponse.json(cards);
}
