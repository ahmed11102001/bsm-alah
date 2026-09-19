// GET /api/email/automations — إعدادات أتمتة الإيميل (حاليًا: عيد الميلاد)
// PUT /api/email/automations — { type, enabled, templateId? }
import { NextResponse } from "next/server";
import { getAppServerSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

function resolveOwnerId(session: any): string {
  if (session.user.role === "OWNER") return session.user.id as string;
  return (session.user.parentId as string | null) ?? (session.user.id as string);
}

const KNOWN_TYPES = ["BIRTHDAY", "POST_DELIVERY", "CART_ABANDONED", "VIP_REPEAT", "WIN_BACK"] as const;

export async function GET() {
  try {
    const session = await getAppServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "غير مصرح لك" }, { status: 401 });
    }
    const ownerId = resolveOwnerId(session);

    const automations = await prisma.emailAutomation.findMany({
      where: { userId: ownerId },
      include: { template: { select: { id: true, name: true, subject: true } } },
    });

    return NextResponse.json({ automations });
  } catch (err: any) {
    console.error("[api/email/automations GET]:", err);
    return NextResponse.json({ error: "فشل جلب الأتمتة" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getAppServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "غير مصرح لك" }, { status: 401 });
    }
    const ownerId = resolveOwnerId(session);
    const body = await req.json().catch(() => ({}));

    const type = body?.type;
    if (!KNOWN_TYPES.includes(type)) {
      return NextResponse.json({ error: "نوع الأتمتة غير معروف", code: "UNKNOWN_TYPE" }, { status: 400 });
    }

    const enabled = body?.enabled === true;
    const templateId =
      typeof body?.templateId === "string" && body.templateId.trim() ? body.templateId.trim() : null;
    const settings = body?.settings ? body.settings : null;

    if (enabled && type !== "CART_ABANDONED" && !templateId) {
      return NextResponse.json(
        { error: "لازم تختار قالب قبل التفعيل", code: "TEMPLATE_REQUIRED" },
        { status: 400 }
      );
    }

    if (enabled && type === "CART_ABANDONED") {
      if (!settings?.steps || !Array.isArray(settings.steps) || settings.steps.length === 0) {
        return NextResponse.json(
          { error: "لازم تضيف خطوات للسلة المتروكة", code: "STEPS_REQUIRED" },
          { status: 400 }
        );
      }
      for (const step of settings.steps) {
        if (!step.templateId) {
          return NextResponse.json(
            { error: "لازم تختار قالب لكل خطوة في السلة المتروكة", code: "STEP_TEMPLATE_REQUIRED" },
            { status: 400 }
          );
        }
      }
    }

    if (templateId) {
      const template = await prisma.emailTemplate.findFirst({
        where: { id: templateId, userId: ownerId },
        select: { id: true },
      });
      if (!template) {
        return NextResponse.json({ error: "القالب مش موجود", code: "TEMPLATE_NOT_FOUND" }, { status: 404 });
      }
    }

    const automation = await prisma.emailAutomation.upsert({
      where: { userId_type: { userId: ownerId, type } },
      update: { enabled, templateId, settings },
      create: { userId: ownerId, type, enabled, templateId, settings },
      include: { template: { select: { id: true, name: true, subject: true } } },
    });

    return NextResponse.json({ automation });
  } catch (err: any) {
    console.error("[api/email/automations PUT]:", err);
    return NextResponse.json({ error: "فشل حفظ الأتمتة" }, { status: 500 });
  }
}
