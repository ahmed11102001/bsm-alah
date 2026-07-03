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
      const customData = payload.pay_load as any;
      if (customData?.projectId) {
        // Here we would upgrade the project plan based on customData.planId
        console.log(`[fawaterak-dev-webhook] Payment received for project ${customData.projectId}`);
        // TODO: Update database (e.g. create subscription record, update limits)
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[fawaterak-dev-webhook]", err);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}
