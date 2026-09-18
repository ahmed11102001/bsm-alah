// /api/crm/contacts/[id] — تفاصيل / تعديل / حذف (soft)
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";
import { getCrmContact, updateCrmContact, deleteCrmContact } from "@/lib/crm/contacts";

function ownerId(session: any): string {
  return (session.user.parentId as string | null) ?? (session.user.id as string);
}

function mapError(err: any) {
  switch (err?.code) {
    case "NOT_FOUND":
      return NextResponse.json({ error: "العميل مش موجود", code: "NOT_FOUND" }, { status: 404 });
    case "PHONE_OR_EMAIL_REQUIRED":
      return NextResponse.json(
        { error: "لازم رقم أو إيميل على الأقل — مينفعش تمسح الاتنين", code: "PHONE_OR_EMAIL_REQUIRED" },
        { status: 400 }
      );
    case "INVALID_PHONE":
      return NextResponse.json({ error: "رقم الهاتف غير صحيح", code: "INVALID_PHONE" }, { status: 400 });
    case "INVALID_EMAIL":
      return NextResponse.json({ error: "الإيميل غير صحيح", code: "INVALID_EMAIL" }, { status: 400 });
    case "CONFLICT":
      return NextResponse.json(
        { error: "الرقم أو الإيميل مرتبط بعميل تاني", code: "CONFLICT" },
        { status: 409 }
      );
    default:
      console.error("[crm-contact-id]", err);
      return NextResponse.json({ error: "حصل خطأ، حاول تاني" }, { status: 500 });
  }
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const denied = requirePermission(session, "CONTACTS_VIEW");
  if (denied) return denied;

  const { id } = await params;
  const contact = await getCrmContact(ownerId(session), id);
  if (!contact) return mapError({ code: "NOT_FOUND" });
  return NextResponse.json({ contact });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const denied = requirePermission(session, "CONTACTS_MANAGE");
  if (denied) return denied;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  try {
    const contact = await updateCrmContact(ownerId(session), id, {
      name: body?.name,
      phone: body?.phone,
      email: body?.email,
      tags: body?.tags,
      notes: body?.notes,
    });
    return NextResponse.json({ contact });
  } catch (err) {
    return mapError(err);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const denied = requirePermission(session, "CONTACTS_MANAGE");
  if (denied) return denied;

  const { id } = await params;
  try {
    await deleteCrmContact(ownerId(session), id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return mapError(err);
  }
}
