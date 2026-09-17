import { NextRequest, NextResponse } from "next/server";
import { getAppServerSession } from "@/lib/auth";
import { sendEmailViaUserSmtp } from "@/lib/email-marketing/sender";

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
    const body = await req.json();

    const { recipientEmail, subject, bodyHtml, previewText } = body;

    if (!recipientEmail || !subject || !bodyHtml) {
      return NextResponse.json(
        { error: "يرجى تحديد البريد المستلم، عنوان الرسالة، ومحتوى القالب" },
        { status: 400 }
      );
    }

    const result = await sendEmailViaUserSmtp(ownerId, {
      to: recipientEmail.trim(),
      recipientName: "مستلم تجريبي",
      subject: `[معاينة تجريبية] ${subject.trim()}`,
      html: bodyHtml,
      previewText: previewText?.trim(),
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "فشل إرسال البريد التجريبي عبر خادم SMTP" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `تم إرسال البريد التجريبي بنجاح إلى ${recipientEmail}`,
    });
  } catch (err: any) {
    console.error("[api/email/templates/test-send POST]:", err);
    return NextResponse.json(
      { error: err?.message || "حدث خطأ أثناء محاولة إرسال التجربة" },
      { status: 500 }
    );
  }
}
