// src/app/api/user/onboarding/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(_req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user)
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { id: session.user.id as string },
      select: { onboardingCompleted: true },
    });

    return NextResponse.json({ completed: user?.onboardingCompleted ?? false });
  } catch (err) {
    console.error("GET /api/user/onboarding:", err);
    return NextResponse.json({ error: "خطأ في السيرفر" }, { status: 500 });
  }
}

export async function POST(_req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user)
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

    await prisma.user.update({
      where: { id: session.user.id as string },
      data: { onboardingCompleted: true },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("POST /api/user/onboarding:", err);
    return NextResponse.json({ error: "خطأ في السيرفر" }, { status: 500 });
  }
}
