// src/app/api/admin/test-gemini/route.ts
// endpoint مؤقت للتست — isSuper فقط
import { NextRequest, NextResponse } from "next/server";
import { getServerSession }          from "next-auth";
import { authOptions }               from "@/lib/auth";
import { getSmartReply }             from "@/lib/gemini";
import prisma                        from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isSuper)
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

  const { message } = await req.json();

  // جيب بيانات البراند بتاعت الـ super admin
  const user = await prisma.user.findUnique({
    where:  { id: session.user.id },
    select: { brandName: true, businessDesc: true, productsInfo: true,
              pricingInfo: true, workingHours: true, aiTone: true },
  });

  const result = await getSmartReply(message ?? "مرحبا", {
    brandName:    user?.brandName,
    businessDesc: user?.businessDesc ?? "تست",
    productsInfo: user?.productsInfo,
    pricingInfo:  user?.pricingInfo,
    workingHours: user?.workingHours,
    aiTone:       user?.aiTone ?? "friendly",
  });

  return NextResponse.json({
    apiKeyPresent: !!process.env.GEMINI_API_KEY,
    apiKeyPrefix:  process.env.GEMINI_API_KEY?.slice(0, 8) + "...",
    businessDesc:  user?.businessDesc,
    result,
  });
}