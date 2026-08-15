import crypto from "crypto";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { rateLimit, getIP } from "@/lib/rate-limit";
import { sendVerificationEmail } from "@/lib/email";

const GENERIC_MESSAGE = "إذا كان الحساب يحتاج إلى تأكيد، سيتم إرسال رابط جديد إلى بريدك الإلكتروني.";

export async function POST(req: Request) {
  const limited = await rateLimit(`resend-verification:${getIP(req)}`, { limit: 3, windowSecs: 60 * 15 });
  if (!limited.success) return NextResponse.json({ success: true, message: GENERIC_MESSAGE });

  try {
    const body = await req.json();
    const email = typeof body?.email === "string" ? body.email.toLowerCase().trim() : "";
    if (!email) return NextResponse.json({ error: "البريد الإلكتروني مطلوب" }, { status: 400 });

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, emailVerified: true },
    });
    if (!user || user.emailVerified) return NextResponse.json({ success: true, message: GENERIC_MESSAGE });

    const token = crypto.randomBytes(32).toString("hex");
    await prisma.emailVerificationToken.deleteMany({ where: { userId: user.id } });
    await prisma.emailVerificationToken.create({
      data: { token, userId: user.id, expires: new Date(Date.now() + 24 * 60 * 60 * 1000) },
    });

    try {
      await sendVerificationEmail(user.email, token);
    } catch (error) {
      await prisma.emailVerificationToken.delete({ where: { token } });
      console.error("[resend-verification] email delivery failed", error instanceof Error ? error.name : "unknown");
    }

    return NextResponse.json({ success: true, message: GENERIC_MESSAGE });
  } catch (error) {
    console.error("[resend-verification] request failed", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ success: true, message: GENERIC_MESSAGE });
  }
}
