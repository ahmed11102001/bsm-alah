import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { requirePermission } from "@/lib/permissions";
import { createTemplateForUser, deleteTemplateForUser } from "@/lib/templates-actions";

// جلب القوالب للعرض
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const denied = requirePermission(session, "TEMPLATES_VIEW");
    if (denied) return denied;
    const ownerId = (session!.user as any).parentId || session!.user.id;
    const templates = await prisma.template.findMany({
      where: { userId: ownerId },
      orderBy: { createdAt: "desc" }
    });
    return NextResponse.json(templates || []);
  } catch (error) {
    return NextResponse.json({ error: "خطأ في السيرفر" }, { status: 500 });
  }
}

// إنشاء قالب يدوي وإرساله لميتا
// ملاحظة أمنية: ده الراوت اللي المستخدم بيستخدمه من الداشبورد بجلسته (session).
// نداءات MCP بقت بتستدعي createTemplateForUser مباشرة من src/lib/templates-actions.ts
// (استيراد عادي، مفيش HTTP round-trip) — من غير أي "internal trust header" قابل للتزوير.
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const denied = requirePermission(session, "TEMPLATES_MANAGE");
    if (denied) return denied;
    const ownerId = (session!.user as any).parentId || session!.user.id;

    const input = await req.json();
    return await createTemplateForUser(ownerId, input);
  } catch (error: any) {
    console.error("Template Create Error:", error);
    return NextResponse.json({ error: error.message || "فشل الحفظ" }, { status: 500 });
  }
}

// حذف قالب
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const denied = requirePermission(session, "TEMPLATES_MANAGE");
    if (denied) return denied;
    const ownerId = (session!.user as any).parentId || session!.user.id;

    const { id } = await req.json();
    return await deleteTemplateForUser(ownerId, id);
  } catch (error) {
    return NextResponse.json({ error: "فشل الحذف" }, { status: 500 });
  }
}
