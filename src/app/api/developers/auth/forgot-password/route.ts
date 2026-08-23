import { NextResponse } from "next/server";
import crypto from "crypto";
import prisma from "@/lib/prisma";
import { rateLimit, getIP } from "@/lib/rate-limit";
import { sendDeveloperResetEmail } from "@/lib/email";
import { getRequestLocale } from "@/lib/locale-resolver";

const GENERIC_MESSAGE = "إذا كان الحساب موجودًا، تم إرسال رابط الاستعادة إلى بريدك الإلكتروني.";

export async function POST(req: Request) {
  const limited = await rateLimit(`developer-forgot-password:${getIP(req)}`, { limit: 5, windowSecs: 60 * 15 });
  if (!limited.success) return NextResponse.json({ success: true, message: GENERIC_MESSAGE });

  try {
    const locale = getRequestLocale(req);
    const body = await req.json();
    const email = typeof body?.email === "string" ? body.email.toLowerCase().trim() : "";
    if (!email) return NextResponse.json({ error: "الإيميل مطلوب" }, { status: 400 });

    const developer = await prisma.developerUser.findUnique({
      where: { email },
      select: { id: true, email: true, firstName: true },
    });
    if (!developer) return NextResponse.json({ success: true, message: GENERIC_MESSAGE });

    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 60 * 60 * 1000);
    await prisma.developerPasswordResetToken.deleteMany({ where: { developerId: developer.id } });
    await prisma.developerPasswordResetToken.create({ data: { token, developerId: developer.id, expires } });

    try {
      await sendDeveloperResetEmail(developer.email, developer.firstName, token, locale);
    } catch (error) {
      await prisma.developerPasswordResetToken.deleteMany({ where: { token } });
      console.error("[developer-forgot-password] email delivery failed", error instanceof Error ? error.name : "unknown");
    }

    return NextResponse.json({ success: true, message: GENERIC_MESSAGE });
  } catch (error) {
    console.error("[developer-forgot-password] request failed", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: "حدث خطأ، حاول ثانية" }, { status: 500 });
  }
}
