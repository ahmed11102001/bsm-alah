// src/app/api/woocommerce/connect/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession }          from "next-auth";
import { authOptions }               from "@/lib/auth";
import prisma                        from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { storeName, storeUrl } = body as { storeName?: string; storeUrl?: string };

    if (!storeName?.trim()) {
      return NextResponse.json({ error: "اسم المتجر مطلوب" }, { status: 400 });
    }

    const dbUser = await prisma.user.findUnique({
      where:  { email: session.user.email },
      select: { id: true, parentId: true },
    });
    if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const userId = dbUser.parentId ?? dbUser.id;

    const store = await prisma.wooCommerceStore.upsert({
      where:  { userId },
      update: {
        storeName: storeName.trim(),
        storeUrl:  storeUrl?.trim() || null,
        isActive:  true,
        updatedAt: new Date(),
      },
      create: {
        userId,
        storeName: storeName.trim(),
        storeUrl:  storeUrl?.trim() || null,
        isActive:  true,
      },
    });

    return NextResponse.json({ success: true, store });
  } catch (error) {
    console.error("[WooCommerce Connect]", error);
    return NextResponse.json({ error: "حدث خطأ أثناء الحفظ" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await prisma.user.findUnique({
      where:  { email: session.user.email },
      select: { id: true, parentId: true },
    });
    if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const userId = dbUser.parentId ?? dbUser.id;
    await prisma.wooCommerceStore.deleteMany({ where: { userId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[WooCommerce Delete]", error);
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 });
  }
}