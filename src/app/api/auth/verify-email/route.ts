import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token");
  if (!token) return NextResponse.json({ error: "رابط التحقق غير صالح" }, { status: 400 });

  try {
    const record = await prisma.emailVerificationToken.findUnique({ where: { token } });
    if (!record || record.expires < new Date()) {
      if (record) await prisma.emailVerificationToken.delete({ where: { id: record.id } });
      return NextResponse.json({ error: "رابط التحقق منتهي أو غير صالح" }, { status: 400 });
    }

    await prisma.$transaction([
      prisma.user.update({ where: { id: record.userId }, data: { emailVerified: new Date() } }),
      prisma.emailVerificationToken.delete({ where: { id: record.id } }),
      prisma.emailVerificationToken.deleteMany({ where: { userId: record.userId } }),
    ]);

    return NextResponse.json({ success: true, message: "تم تأكيد البريد الإلكتروني" });
  } catch (error) {
    console.error("[verify-email] verification failed", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: "تعذر إتمام التحقق" }, { status: 500 });
  }
}
