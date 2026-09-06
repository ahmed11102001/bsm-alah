import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getDevSessionFromRequest } from "@/lib/dev-auth";
import { getProjectForOwner } from "@/lib/dev-project-auth";

const OWNER_PLAN_PRICE = 249;

export async function GET(req: NextRequest) {
  const session = await getDevSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  if (!projectId) return NextResponse.json({ error: "projectId is required" }, { status: 400 });

  const project = await getProjectForOwner(projectId, session.id);
  if (!project) return NextResponse.json({ error: "المشروع مش موجود أو مش بتاعك" }, { status: 404 });

  const pending = await prisma.paymentRequest.findFirst({
    where: { developerProjectId: projectId, status: "PENDING" },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ success: true, pending });
}

export async function POST(req: NextRequest) {
  const session = await getDevSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { projectId, paymentMethod } = await req.json().catch(() => ({}));
  if (!projectId) return NextResponse.json({ error: "projectId is required" }, { status: 400 });
  if (paymentMethod && !["instapay", "etisalat"].includes(paymentMethod)) {
    return NextResponse.json({ error: "طريقة دفع غير صالحة" }, { status: 400 });
  }

  const project = await getProjectForOwner(projectId, session.id);
  if (!project) return NextResponse.json({ error: "المشروع مش موجود أو مش بتاعك" }, { status: 404 });

  if (project.plan === "OWNER_PLAN" && project.planRenewsAt && project.planRenewsAt > new Date()) {
    return NextResponse.json({ error: "المشروع ده مشترك بالفعل في باقة الأونر" }, { status: 409 });
  }

  // منع تكرار طلب pending لنفس المشروع
  const existing = await prisma.paymentRequest.findFirst({
    where: { developerProjectId: projectId, status: "PENDING" },
  });
  if (existing) {
    return NextResponse.json({ success: true, reused: true, paymentRequest: existing });
  }

  const request = await prisma.paymentRequest.create({
    data: {
      developerUserId: session.id,
      developerProjectId: projectId,
      type: "developer_owner_plan",
      productName: `باقة الأونر — مشروع ${project.name}`,
      amount: OWNER_PLAN_PRICE,
      currency: "EGP",
      paymentMethod: paymentMethod ?? null,
      status: "PENDING",
    },
  });

  // 🔔 إشعار الأدمن بفاتورة مطور جديدة — fire-and-forget
  void (async () => {
    try {
      const dev = await prisma.developerUser.findUnique({
        where: { id: session.id },
        select: { firstName: true, lastName: true, email: true },
      });
      const devName = dev ? `${dev.firstName} ${dev.lastName}`.trim() : session.email;
      const { notifyAdminNewPaymentRequest } = await import("@/lib/notifications");
      await notifyAdminNewPaymentRequest({
        payerName: devName || session.email,
        payerEmail: dev?.email ?? session.email,
        productName: request.productName,
        amount: request.amount,
        currency: request.currency,
        isDeveloper: true,
        projectName: project.name,
        paymentRequestId: request.id,
      });
    } catch (err) {
      console.error("[DevBilling] Admin notify failed:", err);
    }
  })();

  return NextResponse.json({ success: true, reused: false, paymentRequest: request });
}
