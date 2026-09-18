// GET /api/crm/contacts — بحث + فلتر قناة + صفحات + إحصائيات
// POST /api/crm/contacts — إضافة يدوية (اسم مطلوب + رقم أو إيميل إجباري)
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";
import { listCrmContacts, createCrmContact, type CrmChannel } from "@/lib/crm/contacts";

function ownerId(session: any): string {
  return (session.user.parentId as string | null) ?? (session.user.id as string);
}

const CHANNELS: CrmChannel[] = ["all", "phone", "email", "both"];

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const denied = requirePermission(session, "CONTACTS_VIEW");
  if (denied) return denied;

  const sp = new URL(req.url).searchParams;
  const channel = (sp.get("channel") ?? "all") as CrmChannel;
  const data = await listCrmContacts({
    ownerId: ownerId(session),
    search: sp.get("q") ?? "",
    channel: CHANNELS.includes(channel) ? channel : "all",
    page: Number(sp.get("page") ?? 1),
    pageSize: Number(sp.get("pageSize") ?? 50),
  });
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const denied = requirePermission(session, "CONTACTS_MANAGE");
  if (denied) return denied;

  const body = await req.json().catch(() => ({}));
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "الاسم مطلوب", code: "NAME_REQUIRED" }, { status: 400 });
  }

  try {
    const { contact, created } = await createCrmContact(ownerId(session), {
      name,
      phone: body?.phone,
      email: body?.email,
      tags: body?.tags,
      notes: body?.notes,
    });
    return NextResponse.json({ contact, created }, { status: created ? 201 : 200 });
  } catch (err: any) {
    if (err?.code === "PHONE_OR_EMAIL_REQUIRED") {
      return NextResponse.json(
        { error: "لازم رقم أو إيميل على الأقل", code: "PHONE_OR_EMAIL_REQUIRED" },
        { status: 400 }
      );
    }
    console.error("[crm-contacts-post]", err);
    return NextResponse.json({ error: "حصل خطأ، حاول تاني" }, { status: 500 });
  }
}
