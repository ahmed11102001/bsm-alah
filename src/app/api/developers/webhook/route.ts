import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import prisma from "@/lib/prisma";

// ─── GET: Meta Webhook Verification ─────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode      = searchParams.get("hub.mode");
  const token     = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
  if (!verifyToken) {
    console.error("[DEV-WEBHOOK] WHATSAPP_VERIFY_TOKEN not set");
    return new NextResponse("Misconfigured", { status: 500 });
  }

  if (mode === "subscribe" && token === verifyToken) {
    console.log("[DEV-WEBHOOK] Verification successful");
    return new NextResponse(challenge, { status: 200 });
  }

  return new NextResponse("Forbidden", { status: 403 });
}

// ─── POST: Receive Meta Template Status Updates ──────────────────────────────
export async function POST(req: NextRequest) {
  // 1. Verify HMAC signature
  const appSecret = process.env.WHATSAPP_APP_SECRET;

  // في Production، الـ WHATSAPP_APP_SECRET مطلوب — بدونه أي حد يقدر يبعت webhook مزيف
  if (!appSecret && process.env.NODE_ENV === "production") {
    console.error("[DEV-WEBHOOK] WHATSAPP_APP_SECRET is required in production");
    return new NextResponse("Server misconfigured", { status: 500 });
  }

  if (appSecret) {
    const sig = req.headers.get("x-hub-signature-256") ?? "";
    if (!sig.startsWith("sha256=")) {
      return new NextResponse("Invalid signature", { status: 401 });
    }
    const rawBody = await req.text();
    const expected = `sha256=${createHmac("sha256", appSecret).update(rawBody, "utf8").digest("hex")}`;
    if (!timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) {
      return new NextResponse("Invalid signature", { status: 401 });
    }
    // Parse after signature verified
    const payload = JSON.parse(rawBody);
    await processWebhook(payload);
  } else {
    // No secret configured — dev mode only
    console.warn("[DEV-WEBHOOK] ⚠️ WHATSAPP_APP_SECRET مش متحط — بيقبل webhooks بدون توقيع (dev mode فقط)");
    const payload = await req.json();
    await processWebhook(payload);
  }

  return NextResponse.json({ ok: true });
}

// ─── Process Meta webhook payload ────────────────────────────────────────────
async function processWebhook(payload: any) {
  const entry = payload?.entry ?? [];

  for (const e of entry) {
    const changes = e?.changes ?? [];
    for (const change of changes) {
      // Meta sends template status updates under "message_template_status_update"
      if (change.field === "message_template_status_update") {
        await handleTemplateStatusUpdate(change.value);
      }
    }
  }
}

// ─── Handle template status change ───────────────────────────────────────────
async function handleTemplateStatusUpdate(value: any) {
  /*
   * Meta payload shape:
   * {
   *   event: "APPROVED" | "REJECTED" | "PENDING_DELETION" | "FLAGGED" | "DISABLED",
   *   message_template_id: "123456789",
   *   message_template_name: "otp_verification",
   *   message_template_language: "ar",
   *   reason: "NONE" | "INCORRECT_CATEGORY" | ...
   * }
   */
  const metaEvent    = value?.event ?? "";
  const metaId       = String(value?.message_template_id ?? "");
  const metaName     = value?.message_template_name ?? "";
  const rejectedReason = value?.reason && value.reason !== "NONE" ? value.reason : null;

  if (!metaId && !metaName) {
    console.warn("[DEV-WEBHOOK] Template update missing id and name", value);
    return;
  }

  // Map Meta event → our status
  const statusMap: Record<string, string> = {
    APPROVED:          "APPROVED",
    REJECTED:          "REJECTED",
    PENDING:           "PENDING",
    PENDING_DELETION:  "DISABLED",
    FLAGGED:           "REJECTED",
    DISABLED:          "DISABLED",
  };
  const newStatus = statusMap[metaEvent];
  if (!newStatus) {
    console.log(`[DEV-WEBHOOK] Unhandled template event: ${metaEvent}`);
    return;
  }

  // Find template by metaTemplateId or name
  const where = metaId
    ? { metaTemplateId: metaId }
    : { name: metaName };

  const template = await prisma.developerOtpTemplate.findFirst({ where });
  if (!template) {
    console.warn(`[DEV-WEBHOOK] Template not found: id=${metaId} name=${metaName}`);
    return;
  }

  await prisma.developerOtpTemplate.update({
    where: { id: template.id },
    data: {
      status: newStatus as any,
      metaTemplateId: metaId || template.metaTemplateId,
      rejectedReason: newStatus === "REJECTED" ? rejectedReason : null,
    },
  });

  console.log(`[DEV-WEBHOOK] Template "${metaName}" → ${newStatus}`);
}