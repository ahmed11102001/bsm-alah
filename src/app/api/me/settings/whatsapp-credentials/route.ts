import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { decryptToken } from "@/lib/crypto";
import { requirePermission } from "@/lib/permissions";

/**
 * Reveal WhatsApp credentials only after re-authenticating with the account password.
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const denied = requirePermission(session, "WHATSAPP_SETTINGS");
  if (denied) return denied;

  const userId = session.user.id as string;
  const ownerId = ((session.user as any).parentId as string | null) ?? userId;

  const body = await req.json().catch(() => ({}));
  const password = typeof body.password === "string" ? body.password : "";

  if (!password) {
    return NextResponse.json(
      { error: "أدخل كلمة المرور أولاً" },
      { status: 400 }
    );
  }

  const [user, account] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { password: true },
    }),
    prisma.whatsAppAccount.findUnique({
      where: { userId: ownerId },
      select: {
        accessToken: true,
        phoneNumberId: true,
        wabaId: true,
      },
    }),
  ]);

  if (!user?.password || !(await bcrypt.compare(password, user.password))) {
    return NextResponse.json(
      { error: "كلمة المرور غير صحيحة" },
      { status: 403 }
    );
  }

  if (!account) {
    return NextResponse.json(
      { error: "لا يوجد ربط واتساب محفوظ" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    accessToken: decryptToken(account.accessToken),
    phoneNumberId: account.phoneNumberId,
    wabaId: account.wabaId,
  });
}