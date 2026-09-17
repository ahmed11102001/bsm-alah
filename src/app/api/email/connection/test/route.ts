import { NextRequest, NextResponse } from "next/server";
import { getAppServerSession } from "@/lib/auth";
import {
  getEmailConnection,
  updateEmailConnectionTestResult,
} from "@/lib/email-marketing/connection";
import { testSmtpConnection } from "@/lib/email-marketing/smtp-test";

function resolveOwnerId(session: any): string {
  if (session.user.role === "OWNER") return session.user.id as string;
  return (session.user.parentId as string | null) ?? (session.user.id as string);
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAppServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "غير مصرح لك" }, { status: 401 });
    }

    const ownerId = resolveOwnerId(session);
    const body = await req.json().catch(() => ({}));

    let host = body.host;
    let port = body.port;
    let secure = body.secure;
    let user = body.user;
    let password = body.password;

    // إذا لم تُمرَّر بيانات أو كانت كلمة المرور نقطية، نقرأ من الاتصال المحفوظ
    if (!host || !user || !password || password === "••••••••") {
      const stored = await getEmailConnection(ownerId);
      if (stored) {
        host = host || stored.host;
        port = port ?? stored.port;
        secure = secure ?? stored.secure;
        user = user || stored.user;
        password = (password && password !== "••••••••") ? password : stored.password;
      }
    }

    if (!host || !user || !password) {
      return NextResponse.json(
        { error: "يرجى إدخال بيانات الخادم والمستخدم وكلمة المرور لاختبار الاتصال" },
        { status: 400 }
      );
    }

    const result = await testSmtpConnection({
      host,
      port: Number(port) || 587,
      secure: Boolean(secure),
      user,
      password,
    });

    // تحديث نتيجة الاختبار في الداتابيز إن وُجد اتصال
    await updateEmailConnectionTestResult(ownerId, result.success).catch(() => {});

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[api/email/connection/test POST]:", err);
    return NextResponse.json(
      { success: false, message: "حدث خطأ غير متوقع أثناء فحص الاتصال" },
      { status: 500 }
    );
  }
}
