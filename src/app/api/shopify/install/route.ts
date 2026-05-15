// src/app/api/shopify/install/route.ts
// ─── ربط Shopify عن طريق Webhook فقط — زي EasyOrders ────────────────────────
import { NextRequest, NextResponse }    from "next/server";
import { getServerSession }             from "next-auth";
import { authOptions }                  from "@/lib/auth";
import prisma                           from "@/lib/prisma";
import { generateShopifyWebhookUrl }    from "@/app/api/shopify/webhooks/route";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "يجب تسجيل الدخول أولاً" }, { status: 401 });
    }

    const body = await req.json();
    const { storeName } = body as { storeName?: string };

    if (!storeName?.trim()) {
      return NextResponse.json({ error: "اسم المتجر مطلوب" }, { status: 400 });
    }

    const dbUser = await prisma.user.findUnique({
      where:  { email: session.user.email },
      select: { id: true, parentId: true },
    });
    if (!dbUser) {
      return NextResponse.json({ error: "المستخدم غير موجود" }, { status: 404 });
    }
    const userId = dbUser.parentId ?? dbUser.id;

    // حفظ المتجر
    await prisma.shopifyStore.upsert({
      where:  { userId },
      update: { shop: storeName.trim(), isActive: true, updatedAt: new Date() },
      create: { userId, shop: storeName.trim(), isActive: true },
    });

    const webhookUrl = generateShopifyWebhookUrl(userId);

    return NextResponse.json({
      success:     true,
      storeName:   storeName.trim(),
      webhookUrl,
    });
  } catch (error) {
    console.error("[Shopify Install] Error:", error);
    return NextResponse.json({ error: "حدث خطأ غير متوقع" }, { status: 500 });
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
    await prisma.shopifyStore.deleteMany({ where: { userId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Shopify Delete] Error:", error);
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 });
  }
}