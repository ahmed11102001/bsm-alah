import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import crypto from "crypto";

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/easy-orders/settings
// جيب إعدادات ربط إيزي أوردرز الحالية
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const store = await prisma.easyOrdersStore.findUnique({
      where: { userId: session.user.id },
      select: {
        id:          true,
        storeName:   true,
        apiKey:      true,
        isActive:    true,
        createdAt:   true,
      },
    });

    // ابن رابط الـ webhook الخاص بهذا المستخدم
    const baseUrl = process.env.NEXTAUTH_URL || `https://${req.headers.get("host")}`;
    const webhookUrl = `${baseUrl}/api/easy-orders/webhooks/${session.user.id}`;

    return NextResponse.json({ store, webhookUrl });
  } catch (error) {
    console.error("[EasyOrders Settings GET] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/easy-orders/settings
// حفظ / تحديث إعدادات ربط إيزي أوردرز
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { storeName, apiKey } = body;

    if (!storeName?.trim() || !apiKey?.trim()) {
      return NextResponse.json(
        { error: "اسم المتجر ومفتاح الـ API مطلوبان" },
        { status: 400 }
      );
    }

    // توليد webhookSecret فريد للتاجر (أو الإبقاء على الموجود)
    const existingStore = await prisma.easyOrdersStore.findUnique({
      where: { userId: session.user.id },
      select: { webhookSecret: true },
    });

    const webhookSecret =
      existingStore?.webhookSecret || crypto.randomBytes(32).toString("hex");

    const store = await prisma.easyOrdersStore.upsert({
      where:  { userId: session.user.id },
      update: { storeName: storeName.trim(), apiKey: apiKey.trim(), isActive: true },
      create: {
        userId:        session.user.id,
        storeName:     storeName.trim(),
        apiKey:        apiKey.trim(),
        webhookSecret,
      },
    });

    // بناء رابط الويب هوك
    const baseUrl = process.env.NEXTAUTH_URL || `https://${req.headers.get("host")}`;
    const webhookUrl = `${baseUrl}/api/easy-orders/webhooks/${session.user.id}`;

    return NextResponse.json({ success: true, store, webhookUrl });
  } catch (error) {
    console.error("[EasyOrders Settings POST] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/easy-orders/settings
// إلغاء ربط إيزي أوردرز
// ─────────────────────────────────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.easyOrdersStore.deleteMany({
      where: { userId: session.user.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[EasyOrders Settings DELETE] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}