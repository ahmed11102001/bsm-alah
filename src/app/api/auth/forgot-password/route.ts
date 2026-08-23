import { NextResponse } from "next/server";
import crypto from "crypto";
import prisma from "@/lib/prisma";
import { rateLimit, getIP } from "@/lib/rate-limit";
import { ForgotPasswordSchema, parseInput } from "@/lib/schemas";
import { sendResetEmail } from "@/lib/email";
import { getRequestLocale } from "@/lib/locale-resolver";

const GENERIC_RESPONSE = {
  success: true,
  message: "إذا كان الحساب موجودًا، تم إرسال رابط الاستعادة إلى بريدك الإلكتروني.",
};

export async function POST(req: Request) {
  const limited = await rateLimit(`forgot-password:${getIP(req)}`, { limit: 5, windowSecs: 60 * 15 });
  if (!limited.success) {
    return NextResponse.json({ success: true, message: GENERIC_RESPONSE.message }, { status: 200 });
  }

  try {
    const locale = getRequestLocale(req);
    const parsed = parseInput(ForgotPasswordSchema, await req.json());
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

    const email = parsed.data.email.toLowerCase().trim();
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true, email: true } });
    if (!user) return NextResponse.json(GENERIC_RESPONSE);

    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 60 * 60 * 1000);

    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });
    await prisma.passwordResetToken.create({ data: { token, userId: user.id, expires } });

    try {
      await sendResetEmail(user.email, token, locale);
    } catch (error) {
      await prisma.passwordResetToken.deleteMany({ where: { token } });
      console.error("[forgot-password] email delivery failed", error instanceof Error ? error.name : "unknown");
    }

    return NextResponse.json(GENERIC_RESPONSE);
  } catch (error) {
    console.error("[forgot-password] request failed", error instanceof Error ? error.name : "unknown");
    return NextResponse.json(GENERIC_RESPONSE);
  }
}
