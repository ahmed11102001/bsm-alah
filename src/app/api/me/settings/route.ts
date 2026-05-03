// src/app/api/me/settings/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

// ─── GET /api/me/settings ─────────────────────────────────────────────────────
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const userId  = session.user.id as string;
  const ownerId = (session.user as any).parentId ?? userId;

  const [user, whatsapp] = await Promise.all([
    prisma.user.findUnique({
      where:  { id: userId },
      select: {
        id: true, name: true, email: true, phone: true, image: true, role: true,
        // ─── Brand fields ───────────────────────────────────────
        brandName: true, businessDesc: true, productsInfo: true,
        pricingInfo: true, workingHours: true, aiTone: true,
      },
    }),
    prisma.whatsAppAccount.findUnique({
      where:  { userId: ownerId },
      select: { phoneNumberId: true, wabaId: true },
    }),
  ]);

  return NextResponse.json({ user, whatsapp });
}

// ─── PATCH /api/me/settings ───────────────────────────────────────────────────
// Body options:
//   { type: "profile",  name, phone }
//   { type: "password", currentPassword, newPassword }
//   { type: "whatsapp", accessToken, phoneNumberId, wabaId }
//   { type: "brand",    brandName, businessDesc, productsInfo, pricingInfo, workingHours, aiTone }
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const userId  = session.user.id as string;
  const ownerId = (session.user as any).parentId ?? userId;

  const body = await req.json();
  const { type } = body;

  // ── Profile ────────────────────────────────────────────────────
  if (type === "profile") {
    const { name, phone } = body;
    if (!name?.trim())
      return NextResponse.json({ error: "الاسم مطلوب" }, { status: 400 });

    const updated = await prisma.user.update({
      where: { id: userId },
      data:  { name: name.trim(), phone: phone?.trim() || null },
      select: { id: true, name: true, email: true, phone: true },
    });

    return NextResponse.json({ success: true, user: updated });
  }

  // ── Password ───────────────────────────────────────────────────
  if (type === "password") {
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword)
      return NextResponse.json({ error: "جميع الحقول مطلوبة" }, { status: 400 });

    if (newPassword.length < 8)
      return NextResponse.json({ error: "كلمة المرور الجديدة 8 أحرف على الأقل" }, { status: 400 });

    const user = await prisma.user.findUnique({
      where:  { id: userId },
      select: { password: true },
    });

    const isValid = await bcrypt.compare(currentPassword, user?.password ?? "");
    if (!isValid)
      return NextResponse.json({ error: "كلمة المرور الحالية غير صحيحة" }, { status: 400 });

    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data:  { password: hashed },
    });

    return NextResponse.json({ success: true });
  }

  // ── WhatsApp settings ──────────────────────────────────────────
  if (type === "whatsapp") {
    if ((session.user as any).parentId)
      return NextResponse.json({ error: "فقط المالك يمكنه تعديل إعدادات واتساب" }, { status: 403 });

    const { accessToken, phoneNumberId, wabaId } = body;
    if (!accessToken || !phoneNumberId || !wabaId)
      return NextResponse.json({ error: "جميع الحقول مطلوبة" }, { status: 400 });

    const account = await prisma.whatsAppAccount.upsert({
      where:  { userId: ownerId },
      update: { accessToken, phoneNumberId, wabaId },
      create: { userId: ownerId, accessToken, phoneNumberId, wabaId },
    });

    return NextResponse.json({
      success: true,
      whatsapp: { phoneNumberId: account.phoneNumberId, wabaId: account.wabaId },
    });
  }

  // ── Brand / AI settings ────────────────────────────────────────
  if (type === "brand") {
    // فقط OWNER يعدّل بيانات البراند
    if ((session.user as any).parentId)
      return NextResponse.json({ error: "فقط المالك يمكنه تعديل بيانات البراند" }, { status: 403 });

    const { brandName, businessDesc, productsInfo, pricingInfo, workingHours, aiTone } = body;

    if (!businessDesc?.trim())
      return NextResponse.json({ error: "وصف النشاط مطلوب" }, { status: 400 });

    const VALID_TONES = ["friendly", "formal", "egyptian"];
    const tone = VALID_TONES.includes(aiTone) ? aiTone : "friendly";

    const updated = await prisma.user.update({
      where: { id: ownerId },
      data: {
        brandName:    brandName?.trim()    || null,
        businessDesc: businessDesc.trim(),
        productsInfo: productsInfo?.trim() || null,
        pricingInfo:  pricingInfo?.trim()  || null,
        workingHours: workingHours?.trim() || null,
        aiTone:       tone,
      },
      select: {
        brandName: true, businessDesc: true, productsInfo: true,
        pricingInfo: true, workingHours: true, aiTone: true,
      },
    });

    return NextResponse.json({ success: true, brand: updated });
  }

  return NextResponse.json({ error: "type غير معروف" }, { status: 400 });
}