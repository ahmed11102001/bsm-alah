import { NextRequest, NextResponse } from "next/server";
import { getAppServerSession } from "@/lib/auth";
import {
  getEmailContacts,
  createEmailContact,
} from "@/lib/email-marketing/contacts";

function resolveOwnerId(session: any): string {
  if (session.user.role === "OWNER") return session.user.id as string;
  return (session.user.parentId as string | null) ?? (session.user.id as string);
}

export async function GET(req: NextRequest) {
  try {
    const session = await getAppServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "غير مصرح لك" }, { status: 401 });
    }

    const ownerId = resolveOwnerId(session);
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || undefined;
    const status = (searchParams.get("status") as any) || undefined;
    const tag = searchParams.get("tag") || undefined;
    const limit = Number(searchParams.get("limit")) || 50;
    const offset = Number(searchParams.get("offset")) || 0;

    const result = await getEmailContacts(ownerId, {
      search,
      status: status !== "ALL" ? status : undefined,
      tag,
      limit,
      offset,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[api/email/contacts GET]:", err);
    return NextResponse.json({ error: "فشل جلب جهات الاتصال" }, { status: 500 });
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

    if (!body.email || !body.email.includes("@")) {
      return NextResponse.json({ error: "البريد الإلكتروني غير صالح" }, { status: 400 });
    }

    const contact = await createEmailContact(ownerId, {
      email: body.email,
      firstName: body.firstName,
      lastName: body.lastName,
      tags: body.tags,
      status: body.status,
    });

    return NextResponse.json(contact);
  } catch (err: any) {
    console.error("[api/email/contacts POST]:", err);
    return NextResponse.json({ error: "فشل إضافة جهة الاتصال" }, { status: 500 });
  }
}
