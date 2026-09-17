import { NextRequest, NextResponse } from "next/server";
import { getAppServerSession } from "@/lib/auth";
import {
  getEmailTemplateById,
  updateEmailTemplate,
  deleteEmailTemplate,
} from "@/lib/email-marketing/templates";

function resolveOwnerId(session: any): string {
  if (session.user.role === "OWNER") return session.user.id as string;
  return (session.user.parentId as string | null) ?? (session.user.id as string);
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAppServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "غير مصرح لك" }, { status: 401 });
    }

    const ownerId = resolveOwnerId(session);
    const { id } = await params;
    const template = await getEmailTemplateById(ownerId, id);

    if (!template) {
      return NextResponse.json({ error: "القالب غير موجود" }, { status: 404 });
    }

    return NextResponse.json(template);
  } catch (err: any) {
    console.error("[api/email/templates/[id] GET]:", err);
    return NextResponse.json({ error: "فشل جلب القالب" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAppServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "غير مصرح لك" }, { status: 401 });
    }

    const ownerId = resolveOwnerId(session);
    const { id } = await params;
    const body = await req.json();

    await updateEmailTemplate(ownerId, id, body);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[api/email/templates/[id] PATCH]:", err);
    return NextResponse.json({ error: "فشل تحديث القالب" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAppServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "غير مصرح لك" }, { status: 401 });
    }

    const ownerId = resolveOwnerId(session);
    const { id } = await params;

    await deleteEmailTemplate(ownerId, id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[api/email/templates/[id] DELETE]:", err);
    return NextResponse.json({ error: "فشل حذف القالب" }, { status: 500 });
  }
}
