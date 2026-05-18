// src/app/api/me/settings/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession }          from "next-auth";
import { authOptions }               from "@/lib/auth";
import prisma                        from "@/lib/prisma";
import bcrypt                        from "bcryptjs";
import { normalizePhone }            from "@/lib/phone";
import { encryptToken }              from "@/lib/crypto";

const VALID_TONES = ["friendly", "formal", "egyptian"] as const;

// ─── GET /api/me/settings ─────────────────────────────────────────────────────
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const userId  = session.user.id as string;
  const ownerId = (session.user as any).parentId ?? userId;

  const [user, whatsapp, agent] = await Promise.all([
    prisma.user.findUnique({
      where:  { id: userId },
      select: { id: true, name: true, email: true, phone: true, image: true, role: true },
    }),
    prisma.whatsAppAccount.findUnique({
      where:  { userId: ownerId },
      select: { phoneNumberId: true, wabaId: true },
    }),
    // ── Brand data من AIAgent (المصدر الحقيقي) ───────────────────────────────
    prisma.aIAgent.findUnique({
      where:  { userId: ownerId },
      select: {
        brandName: true, businessDesc: true, productsInfo: true,
        pricingInfo: true, workingHours: true, tone: true,
      },
    }),
  ]);

  // نرجع brand data باسم aiTone عشان الـ UI يفضل شغال بدون تعديل
  const brand = agent ? {
    brandName:    agent.brandName,
    businessDesc: agent.businessDesc,
    productsInfo: agent.productsInfo,
    pricingInfo:  agent.pricingInfo,
    workingHours: agent.workingHours,
    aiTone:       agent.tone,          // ← نحول tone → aiTone للـ UI
  } : null;

  return NextResponse.json({ user, whatsapp, brand });
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

  // ── Profile ──────────────────────────────────────────────────────────────────
  if (type === "profile") {
    const { name, phone } = body;
    if (!name?.trim())
      return NextResponse.json({ error: "الاسم مطلوب" }, { status: 400 });

    const normalizedPhone = phone?.trim() ? normalizePhone(phone) : null;
    if (phone?.trim() && !normalizedPhone)
      return NextResponse.json({ error: "رقم الهاتف غير صالح" }, { status: 400 });

    const updated = await prisma.user.update({
      where:  { id: userId },
      data:   { name: name.trim(), phone: normalizedPhone },
      select: { id: true, name: true, email: true, phone: true },
    });

    return NextResponse.json({ success: true, user: updated });
  }

  // ── Password ─────────────────────────────────────────────────────────────────
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
    await prisma.user.update({ where: { id: userId }, data: { password: hashed } });

    return NextResponse.json({ success: true });
  }

  // ── WhatsApp ─────────────────────────────────────────────────────────────────
  if (type === "whatsapp") {
    if ((session.user as any).parentId)
      return NextResponse.json({ error: "فقط المالك يمكنه تعديل إعدادات واتساب" }, { status: 403 });

    const { accessToken, phoneNumberId, wabaId } = body;
    if (!accessToken || !phoneNumberId || !wabaId)
      return NextResponse.json({ error: "جميع الحقول مطلوبة" }, { status: 400 });

    const account = await prisma.whatsAppAccount.upsert({
      where:  { userId: ownerId },
      update: { accessToken: encryptToken(accessToken), phoneNumberId, wabaId },
      create: { userId: ownerId, accessToken: encryptToken(accessToken), phoneNumberId, wabaId },
    });

    return NextResponse.json({
      success: true,
      whatsapp: { phoneNumberId: account.phoneNumberId, wabaId: account.wabaId },
    });
  }

  // ── Brand / AI settings → AIAgent (المصدر الحقيقي) ───────────────────────────
  if (type === "brand") {
    if ((session.user as any).parentId)
      return NextResponse.json({ error: "فقط المالك يمكنه تعديل بيانات البراند" }, { status: 403 });

    const { brandName, businessDesc, productsInfo, pricingInfo, workingHours, aiTone } = body;

    if (!businessDesc?.trim())
      return NextResponse.json({ error: "وصف النشاط مطلوب" }, { status: 400 });

    const tone = VALID_TONES.includes(aiTone) ? aiTone : "friendly";

    const payload = {
      brandName:    brandName?.trim()    || null,
      businessDesc: businessDesc.trim(),
      productsInfo: productsInfo?.trim() || null,
      pricingInfo:  pricingInfo?.trim()  || null,
      workingHours: workingHours?.trim() || null,
      tone,
    };

    // upsert في AIAgent — الـ source of truth الوحيد
    const agent = await prisma.aIAgent.upsert({
      where:  { userId: ownerId },
      update: payload,
      create: { userId: ownerId, ...payload },
      select: {
        brandName: true, businessDesc: true, productsInfo: true,
        pricingInfo: true, workingHours: true, tone: true,
      },
    });

    return NextResponse.json({
      success: true,
      brand: { ...agent, aiTone: agent.tone }, // ← نحول tone → aiTone للـ UI
    });
  }

  return NextResponse.json({ error: "type غير معروف" }, { status: 400 });
}