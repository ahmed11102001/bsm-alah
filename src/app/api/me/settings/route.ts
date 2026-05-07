// src/app/api/me/settings/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { normalizePhone } from "@/lib/phone";

// â”€â”€â”€ GET /api/me/settings â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return NextResponse.json({ error: "ØºÙŠØ± Ù…ØµØ±Ø­" }, { status: 401 });

  const userId  = session.user.id as string;
  const ownerId = (session.user as any).parentId ?? userId;

  const [user, whatsapp] = await Promise.all([
    prisma.user.findUnique({
      where:  { id: userId },
      select: {
        id: true, name: true, email: true, phone: true, image: true, role: true,
        // â”€â”€â”€ Brand fields â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€â”€ PATCH /api/me/settings â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Body options:
//   { type: "profile",  name, phone }
//   { type: "password", currentPassword, newPassword }
//   { type: "whatsapp", accessToken, phoneNumberId, wabaId }
//   { type: "brand",    brandName, businessDesc, productsInfo, pricingInfo, workingHours, aiTone }
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return NextResponse.json({ error: "ØºÙŠØ± Ù…ØµØ±Ø­" }, { status: 401 });

  const userId  = session.user.id as string;
  const ownerId = (session.user as any).parentId ?? userId;

  const body = await req.json();
  const { type } = body;

  // â”€â”€ Profile â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (type === "profile") {
    const { name, phone } = body;
    if (!name?.trim())
      return NextResponse.json({ error: "Ø§Ù„Ø§Ø³Ù… Ù…Ø·Ù„ÙˆØ¨" }, { status: 400 });

    const normalizedPhone = phone?.trim() ? normalizePhone(phone) : null;
    if (phone?.trim() && !normalizedPhone)
      return NextResponse.json({ error: "رقم الهاتف غير صالح" }, { status: 400 });

    const updated = await prisma.user.update({
      where: { id: userId },
      data:  { name: name.trim(), phone: normalizedPhone },
      select: { id: true, name: true, email: true, phone: true },
    });

    return NextResponse.json({ success: true, user: updated });
  }

  // â”€â”€ Password â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (type === "password") {
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword)
      return NextResponse.json({ error: "Ø¬Ù…ÙŠØ¹ Ø§Ù„Ø­Ù‚ÙˆÙ„ Ù…Ø·Ù„ÙˆØ¨Ø©" }, { status: 400 });

    if (newPassword.length < 8)
      return NextResponse.json({ error: "ÙƒÙ„Ù…Ø© Ø§Ù„Ù…Ø±ÙˆØ± Ø§Ù„Ø¬Ø¯ÙŠØ¯Ø© 8 Ø£Ø­Ø±Ù Ø¹Ù„Ù‰ Ø§Ù„Ø£Ù‚Ù„" }, { status: 400 });

    const user = await prisma.user.findUnique({
      where:  { id: userId },
      select: { password: true },
    });

    const isValid = await bcrypt.compare(currentPassword, user?.password ?? "");
    if (!isValid)
      return NextResponse.json({ error: "ÙƒÙ„Ù…Ø© Ø§Ù„Ù…Ø±ÙˆØ± Ø§Ù„Ø­Ø§Ù„ÙŠØ© ØºÙŠØ± ØµØ­ÙŠØ­Ø©" }, { status: 400 });

    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data:  { password: hashed },
    });

    return NextResponse.json({ success: true });
  }

  // â”€â”€ WhatsApp settings â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (type === "whatsapp") {
    if ((session.user as any).parentId)
      return NextResponse.json({ error: "ÙÙ‚Ø· Ø§Ù„Ù…Ø§Ù„Ùƒ ÙŠÙ…ÙƒÙ†Ù‡ ØªØ¹Ø¯ÙŠÙ„ Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª ÙˆØ§ØªØ³Ø§Ø¨" }, { status: 403 });

    const { accessToken, phoneNumberId, wabaId } = body;
    if (!accessToken || !phoneNumberId || !wabaId)
      return NextResponse.json({ error: "Ø¬Ù…ÙŠØ¹ Ø§Ù„Ø­Ù‚ÙˆÙ„ Ù…Ø·Ù„ÙˆØ¨Ø©" }, { status: 400 });

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

  // â”€â”€ Brand / AI settings â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (type === "brand") {
    // ÙÙ‚Ø· OWNER ÙŠØ¹Ø¯Ù‘Ù„ Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ø¨Ø±Ø§Ù†Ø¯
    if ((session.user as any).parentId)
      return NextResponse.json({ error: "ÙÙ‚Ø· Ø§Ù„Ù…Ø§Ù„Ùƒ ÙŠÙ…ÙƒÙ†Ù‡ ØªØ¹Ø¯ÙŠÙ„ Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ø¨Ø±Ø§Ù†Ø¯" }, { status: 403 });

    const { brandName, businessDesc, productsInfo, pricingInfo, workingHours, aiTone } = body;

    if (!businessDesc?.trim())
      return NextResponse.json({ error: "ÙˆØµÙ Ø§Ù„Ù†Ø´Ø§Ø· Ù…Ø·Ù„ÙˆØ¨" }, { status: 400 });

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

  return NextResponse.json({ error: "type ØºÙŠØ± Ù…Ø¹Ø±ÙˆÙ" }, { status: 400 });
}

