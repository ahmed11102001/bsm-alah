import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import crypto from "crypto";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY || "dummy");

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email) {
      return NextResponse.json({ error: "الإيميل مطلوب" }, { status: 400 });
    }

    const developer = await prisma.developerUser.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!developer) {
      // Return success even if not found to prevent email enumeration
      return NextResponse.json({ success: true, message: "إذا كان الحساب موجوداً، تم إرسال رابط الاستعادة." });
    }

    // Generate token
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

    await prisma.developerPasswordResetToken.create({
      data: {
        token,
        developerId: developer.id,
        expires,
      },
    });

    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/developers/reset-password?token=${token}`;

    console.log("=========================================");
    console.log("Developer Password Reset Link generated:");
    console.log(resetUrl);
    console.log("=========================================");

    // Attempt to send email if RESEND_API_KEY is configured
    if (process.env.RESEND_API_KEY) {
      try {
        await resend.emails.send({
          from: "WhatsPro Developer Portal <noreply@yourdomain.com>", // Update with verified sender
          to: developer.email,
          subject: "استعادة كلمة المرور - بوابة المطورين",
          html: `
            <div dir="rtl" style="font-family: Arial, sans-serif; line-height: 1.6;">
              <h2>مرحباً ${developer.firstName}،</h2>
              <p>لقد طلبت استعادة كلمة المرور الخاصة بحسابك في بوابة المطورين.</p>
              <p>يرجى النقر على الرابط التالي لتعيين كلمة مرور جديدة (الرابط صالح لمدة ساعة واحدة):</p>
              <a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; background-color: #20d378; color: #060810; text-decoration: none; border-radius: 5px; font-weight: bold;">تغيير كلمة المرور</a>
              <p>إذا لم تطلب هذا، يمكنك تجاهل هذه الرسالة.</p>
            </div>
          `,
        });
      } catch (emailError) {
        console.error("Failed to send reset email via Resend:", emailError);
      }
    }

    return NextResponse.json({ success: true, message: "إذا كان الحساب موجوداً، تم إرسال رابط الاستعادة." });
  } catch (err) {
    console.error("[dev-forgot-password]", err);
    return NextResponse.json({ error: "حصل خطأ، حاول تاني" }, { status: 500 });
  }
}
