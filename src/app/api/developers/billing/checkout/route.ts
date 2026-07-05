import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createFawaterakInvoice, buildFawaterakCustomer } from "@/lib/fawaterak";
import { getDevSessionFromRequest } from "@/lib/dev-auth";
import { getProjectForOwner } from "@/lib/dev-project-auth";

export async function POST(req: NextRequest) {
  try {
    const session = await getDevSessionFromRequest(req);
    if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

    const { projectId } = await req.json();
    if (!projectId) return NextResponse.json({ error: "projectId is required" }, { status: 400 });

    const project = await getProjectForOwner(projectId, session.id);
    if (!project) return NextResponse.json({ error: "المشروع مش موجود أو مش بتاعك" }, { status: 404 });

    if (project.plan === "OWNER_PLAN" && (!project.planRenewsAt || new Date() <= project.planRenewsAt)) {
      return NextResponse.json({ error: "المشروع ده مشترك بالفعل في باقة الأونر" }, { status: 409 });
    }

    const owner = await prisma.developerUser.findUnique({ where: { id: session.id } });
    if (!owner) return NextResponse.json({ error: "حساب المطور مش موجود" }, { status: 404 });

    const { checkoutUrl } = await createFawaterakInvoice({
      cartTotal: 249,
      currency: "EGP",
      customer: buildFawaterakCustomer({
        name: `${owner.firstName} ${owner.lastName}`,
        email: owner.email,
        phone: owner.phone,
      }),
      cartItems: [{ name: `باقة الأونر — اشتراك شهري لمشروع ${project.name}`, price: 249, quantity: 1 }],
      redirectionUrls: {
        successUrl: `${process.env.NEXT_PUBLIC_APP_URL}/developers/portal/projects/${projectId}/billing?status=success`,
        failUrl: `${process.env.NEXT_PUBLIC_APP_URL}/developers/portal/projects/${projectId}/billing?status=failed`,
        pendingUrl: `${process.env.NEXT_PUBLIC_APP_URL}/developers/portal/projects/${projectId}/billing?status=pending`,
        webhookUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/developers/webhooks/fawaterak`,
      },
      payLoad: { ownerId: session.id, projectId, type: "owner_plan_subscription" },
    });

    return NextResponse.json({ checkoutUrl });
  } catch (err: any) {
    console.error("Fawaterak Checkout Error:", err);
    return NextResponse.json({ error: "حصل خطأ في إنشاء الفاتورة، يرجى المحاولة لاحقاً" }, { status: 500 });
  }
}
