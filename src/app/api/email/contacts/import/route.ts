import { NextRequest, NextResponse } from "next/server";
import { getAppServerSession } from "@/lib/auth";
import { importEmailContacts } from "@/lib/email-marketing/contacts";

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

    if (!Array.isArray(body.contacts)) {
      return NextResponse.json(
        { error: "بيانات الاستيراد يجب أن تكون مصفوفة من جهات الاتصال" },
        { status: 400 }
      );
    }

    const result = await importEmailContacts(ownerId, body.contacts);
    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    console.error("[api/email/contacts/import POST]:", err);
    return NextResponse.json({ error: "فشل استيراد جهات الاتصال" }, { status: 500 });
  }
}
