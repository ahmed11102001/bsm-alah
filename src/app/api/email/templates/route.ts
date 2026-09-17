import { NextRequest, NextResponse } from "next/server";
import { getAppServerSession } from "@/lib/auth";
import {
  getEmailTemplates,
  createEmailTemplate,
} from "@/lib/email-marketing/templates";

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
    const templates = await getEmailTemplates(ownerId);

    return NextResponse.json(templates);
  } catch (err: any) {
    console.error("[api/email/templates GET]:", err);
    return NextResponse.json({ error: "فشل جلب القوالب" }, { status: 500 });
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

    if (!body.name || !body.subject || !body.bodyHtml) {
      return NextResponse.json(
        { error: "يرجى ملء جميع الحقول الإلزامية (اسم القالب، عنوان الرسالة، ومحتوى الإيميل)" },
        { status: 400 }
      );
    }

    const template = await createEmailTemplate(ownerId, {
      name: body.name,
      subject: body.subject,
      bodyHtml: body.bodyHtml,
      previewText: body.previewText,
    });

    return NextResponse.json(template);
  } catch (err: any) {
    console.error("[api/email/templates POST]:", err);
    return NextResponse.json({ error: "فشل إنشاء القالب" }, { status: 500 });
  }
}
