import { NextRequest, NextResponse } from "next/server";
import { getAppServerSession } from "@/lib/auth";
import {
  getEmailConnection,
  saveEmailConnection,
  deleteEmailConnection,
} from "@/lib/email-marketing/connection";

function resolveOwnerId(session: any): string {
  if (session.user.role === "OWNER") return session.user.id as string;
  return (session.user.parentId as string | null) ?? (session.user.id as string);
}

export async function GET() {
  try {
    const session = await getAppServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "غير مصرح لك" }, { status: 401 });
    }

    const ownerId = resolveOwnerId(session);
    const connection = await getEmailConnection(ownerId);

    if (!connection) {
      return NextResponse.json({ isConfigured: false });
    }

    return NextResponse.json({
      ...connection,
      // لا نرسل كلمة المرور الصريحة للواجهة لأسباب أمنية
      password: connection.password ? "••••••••" : "",
    });
  } catch (err: any) {
    console.error("[api/email/connection GET]:", err);
    return NextResponse.json({ error: "حدث خطأ أثناء جلب بيانات الاتصال" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAppServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "غير مصرح لك" }, { status: 401 });
    }

    const ownerId = resolveOwnerId(session);
    const body = await req.json();

    if (!body.host || !body.user || !body.fromEmail) {
      return NextResponse.json(
        { error: "يرجى ملء جميع الحقول الإلزامية (الخادم، اسم المستخدم، وبريد الإرسال)" },
        { status: 400 }
      );
    }

    const saved = await saveEmailConnection(ownerId, body);

    return NextResponse.json({
      success: true,
      id: saved.id,
      host: saved.host,
      port: saved.port,
      fromEmail: saved.fromEmail,
      fromName: saved.fromName,
    });
  } catch (err: any) {
    console.error("[api/email/connection POST]:", err);
    return NextResponse.json({ error: "فشل حفظ إعدادات خادم البريد" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const session = await getAppServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "غير مصرح لك" }, { status: 401 });
    }

    const ownerId = resolveOwnerId(session);
    await deleteEmailConnection(ownerId);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[api/email/connection DELETE]:", err);
    return NextResponse.json({ error: "فشل حذف الاتصال" }, { status: 500 });
  }
}
