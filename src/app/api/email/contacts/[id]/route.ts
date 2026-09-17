import { NextRequest, NextResponse } from "next/server";
import { getAppServerSession } from "@/lib/auth";
import {
  updateEmailContact,
  deleteEmailContact,
} from "@/lib/email-marketing/contacts";

function resolveOwnerId(session: any): string {
  if (session.user.role === "OWNER") return session.user.id as string;
  return (session.user.parentId as string | null) ?? (session.user.id as string);
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

    await updateEmailContact(ownerId, id, body);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[api/email/contacts/[id] PATCH]:", err);
    return NextResponse.json({ error: "فشل تحديث جهة الاتصال" }, { status: 500 });
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

    await deleteEmailContact(ownerId, id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[api/email/contacts/[id] DELETE]:", err);
    return NextResponse.json({ error: "فشل حذف جهة الاتصال" }, { status: 500 });
  }
}
