import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { requirePermission } from "@/lib/permissions";
import { createTemplateForUser, deleteTemplateForUser } from "@/lib/templates-actions";

// جلب القوالب للعرض — مع علامة الحساب المالك لكل قالب (للبادج)
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const denied = requirePermission(session, "TEMPLATES_VIEW");
    if (denied) return denied;
    const ownerId = (session!.user as any).parentId || session!.user.id;
    const [templates, account] = await Promise.all([
      prisma.template.findMany({
        where: { userId: ownerId },
        orderBy: { createdAt: "desc" }
      }),
      prisma.whatsAppAccount.findUnique({
        where: { userId: ownerId },
        select: { id: true, wabaId: true },
      }),
    ]);
    // isCurrentAccount: القالب يخص الحساب المتصل حاليًا (أو قديم غير منسوب).
    // مهم: WhatsAppAccount صف واحد ثابت لكل يوزر (upsert على userId) —
    // بيتم الكتابة فوقه في نفس الـ id عند كل إعادة ربط، فـ whatsappAccountId
    // (foreign key) بيفضل ثابت على نفس القيمة للأبد بغض النظر عن أي حساب
    // واتساب اتربط فعليًا وقتها. ده يخليه عديم الفايدة كمؤشر على "هل ده
    // نفس الحساب الحالي" — أي قالب اتزامن قبل كده (قديم أو جديد) هيبقى
    // whatsappAccountId بتاعه == account.id دايمًا (tautology).
    // الفيصل الحقيقي الوحيد هو wabaId، لأنه قيمة نصية بتتاخد "صورة" وقت
    // المزامنة نفسها ومش بتتغير بعد كده لحد ما يتزامن القالب تاني.
    const shaped = (templates || []).map((t: (typeof templates)[number]) => ({
      ...t,
      isCurrentAccount: !account || t.wabaId == null || t.wabaId === account.wabaId,
    }));
    return NextResponse.json(shaped);
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
