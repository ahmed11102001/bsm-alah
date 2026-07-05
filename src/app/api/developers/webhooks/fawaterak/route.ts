import { NextRequest, NextResponse } from "next/server";
import { verifyFawaterakWebhook, FawaterakWebhookPayload } from "@/lib/fawaterak";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const payload = (await req.json()) as FawaterakWebhookPayload;

    if (!verifyFawaterakWebhook(payload)) {
      console.warn("[fawaterak-dev-webhook] Invalid signature", payload);
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    if (payload.invoice_status === "paid") {
      const customData = payload.pay_load as { ownerId?: string; projectId?: string; type?: string } | null;

      if (customData?.type === "owner_plan_subscription" && customData.projectId) {
        console.log(`[fawaterak-dev-webhook] Payment received for project ${customData.projectId}`);
        
        const project = await prisma.developerProject.findUnique({
          where: { id: customData.projectId },
          select: { planRenewsAt: true },
        });

        const baseDate = project?.planRenewsAt && project.planRenewsAt > new Date()
          ? project.planRenewsAt
          : new Date();

        const newRenewsAt = new Date(baseDate.getTime() + 30 * 24 * 60 * 60 * 1000);

        await prisma.developerProject.update({
          where: { id: customData.projectId },
          data: {
            plan: "OWNER_PLAN",
            planStartedAt: new Date(),
            planRenewsAt: newRenewsAt,
            planExpiringNotifiedAt: null,
            planExpiredNotifiedAt: null,
          },
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[fawaterak-dev-webhook]", err);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}
