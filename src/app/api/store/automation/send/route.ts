// src/app/api/store/automation/send/route.ts
// ─── إرسال أتمتة العروض يدوياً لعملاء مختارين من المتجر ──────────────────────
//
// POST body: {
//   source:  "shopify" | "easyorders" | "woocommerce",
//   phones:  string[],   // أرقام العملاء المختارين (مُنظَّفة)
// }
//
// الـ endpoint بيجيب إعدادات الأتمتة (promo) ويبعت القالب الرسمي
// لكل رقم هاتف على حدة، ويرجع ملخص { sent, failed }

import { NextRequest, NextResponse } from "next/server";
import { getServerSession }          from "next-auth";
import { authOptions }               from "@/lib/auth";
import prisma                        from "@/lib/prisma";
import { sendWhatsAppMessage }       from "@/lib/whatsapp-api";
import { decryptToken }              from "@/lib/crypto";
import { MessageDirection, MessageStatus, MessageType } from "@/types/enums";

type StoreSource = "shopify" | "easyorders" | "woocommerce";

function resolveOwnerId(session: any): string {
  return (session.user.parentId as string | null) ?? (session.user.id as string);
}

function buildAutomationWhere(source: StoreSource, storeId: string) {
  if (source === "shopify")
    return { shopifyStoreId_type:     { shopifyStoreId:     storeId, type: "promo" as const } };
  if (source === "easyorders")
    return { easyOrdersStoreId_type:  { easyOrdersStoreId:  storeId, type: "promo" as const } };
  return   { wooCommerceStoreId_type: { wooCommerceStoreId: storeId, type: "promo" as const } };
}

function getStoreId(user: any, source: StoreSource): string | undefined {
  if (source === "shopify")     return user.shopifyStore?.id;
  if (source === "easyorders")  return user.easyOrdersStore?.id;
  if (source === "woocommerce") return user.wooCommerceStore?.id;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ownerId = resolveOwnerId(session);

  let body: { source?: string; phones?: string[] };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { source, phones } = body;

  if (!source || !["shopify", "easyorders", "woocommerce"].includes(source)) {
    return NextResponse.json({ error: "source غير صحيح" }, { status: 400 });
  }
  if (!phones || !Array.isArray(phones) || phones.length === 0) {
    return NextResponse.json({ error: "phones مطلوب" }, { status: 400 });
  }
  if (phones.length > 500) {
    return NextResponse.json({ error: "الحد الأقصى 500 عميل في المرة الواحدة" }, { status: 400 });
  }

  // ── جيب المتجر ───────────────────────────────────────────────────────────
  const user = await prisma.user.findUnique({
    where:  { id: ownerId },
    select: {
      id:               true,
      shopifyStore:     { select: { id: true } },
      easyOrdersStore:  { select: { id: true } },
      wooCommerceStore: { select: { id: true } },
    },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const storeId = getStoreId(user, source as StoreSource);
  if (!storeId) {
    return NextResponse.json({ error: `${source} غير مربوط` }, { status: 404 });
  }

  // ── جيب إعدادات أتمتة العروض ─────────────────────────────────────────────
  const automation = await prisma.storeAutomation.findUnique({
    where:   buildAutomationWhere(source as StoreSource, storeId),
    include: {
      template: { select: { id: true, name: true, language: true, status: true } },
      user: {
        select: {
          whatsappAccount: { select: { accessToken: true, phoneNumberId: true } },
        },
      },
    },
  });

  if (!automation) {
    return NextResponse.json({ error: "أتمتة العروض غير موجودة — فعّلها أولاً" }, { status: 404 });
  }
  if (!automation.isEnabled) {
    return NextResponse.json({ error: "أتمتة العروض غير مفعّلة" }, { status: 422 });
  }
  if (!automation.template || automation.template.status?.toLowerCase() !== "approved") {
    return NextResponse.json({ error: "القالب غير معتمد من ميتا" }, { status: 422 });
  }

  const account = automation.user?.whatsappAccount;
  if (!account) {
    return NextResponse.json({ error: "لم يتم ربط حساب واتساب" }, { status: 422 });
  }

  const decryptedToken    = decryptToken(account.accessToken);
  const { name: tplName, language: tplLang } = automation.template;

  // ── أرسل لكل رقم ─────────────────────────────────────────────────────────
  let sent   = 0;
  let failed = 0;
  const errors: string[] = [];

  // جيب الـ contacts دفعة واحدة
  const cleanPhones = phones.map((p) => p.replace(/\D/g, "")).filter(Boolean);
  const contacts    = await prisma.contact.findMany({
    where:  { phone: { in: cleanPhones }, userId: ownerId },
    select: { id: true, phone: true },
  });
  const contactMap  = new Map(contacts.map((c) => [c.phone, c.id]));

  for (const rawPhone of cleanPhones) {
    const contactId = contactMap.get(rawPhone);

    const result = await sendWhatsAppMessage({
      toPhone:       rawPhone,
      phoneNumberId: account.phoneNumberId,
      accessToken:   decryptedToken,
      messageType:   "template",
      templateName:  tplName,
      templateLang:  tplLang ?? "ar",
      templateVars:  null,
      content:       null,
    });

    // سجّل في الـ messages
    if (contactId) {
      await prisma.message.create({
        data: {
          userId:     ownerId,
          contactId,
          content:    `[عرض] ${tplName}`,
          type:       MessageType.template,
          direction:  MessageDirection.outbound,
          status:     result.ok ? MessageStatus.sent : MessageStatus.failed,
          whatsappId: result.ok ? result.whatsappMsgId : null,
          error:      result.ok ? null : (result.error ?? "فشل الإرسال"),
          sentAt:     result.ok ? new Date() : null,
        },
      }).catch(() => {});
    }

    if (result.ok) {
      sent++;
    } else {
      failed++;
      if (errors.length < 5) errors.push(`${rawPhone}: ${result.error ?? "unknown"}`);
    }

    // delay بسيط بين الرسائل لتجنب rate limit
    await new Promise((r) => setTimeout(r, 300));
  }

  // زوّد عداد الإرسال في الأتمتة
  if (sent > 0) {
    await prisma.storeAutomation.update({
      where: { id: automation.id },
      data:  { sentCount: { increment: sent } },
    }).catch(() => {});
  }

  console.log(`[PromoSend] ✓ ${sent} sent / ${failed} failed for userId: ${ownerId}`);

  return NextResponse.json({ success: true, sent, failed, errors });
}