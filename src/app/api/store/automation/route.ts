// src/app/api/store/automation/route.ts
// ─── أتمتات المتجر: Shopify + EasyOrders + WooCommerce ───────────────────────

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

type StoreAutomationType = "order_confirm" | "order_shipped" | "promo" | "cart_abandon";
const VALID_TYPES: StoreAutomationType[] = ["order_confirm", "order_shipped", "promo", "cart_abandon"];

// أنواع الأتمتة اللي ليها قالب مخصص (مش اختيار حر)
const DEDICATED_TYPES: StoreAutomationType[] = ["order_confirm", "order_shipped", "cart_abandon"];

// أسماء القوالب المخصصة لكل نوع أتمتة
// المستخدم لازم يعمل قوالب على ميتا بهذه الأسماء بالظبط
export const DEDICATED_TEMPLATE_NAMES: Record<string, string> = {
  order_confirm: "order_confirmation",
  order_shipped: "order_shipped",
  cart_abandon: "cart_abandon",
};

type StoreSource = "shopify" | "easyorders" | "woocommerce";

function resolveOwnerId(session: any): string {
  return (session.user.parentId as string | null) ?? (session.user.id as string);
}

// ── GET ───────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ownerId = resolveOwnerId(session);

  const user = await prisma.user.findUnique({
    where: { id: ownerId },
    select: {
      id: true,
      shopifyStore: { select: { id: true } },
      easyOrdersStore: { select: { id: true } },
      wooCommerceStore: { select: { id: true } },
    },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const source = new URL(req.url).searchParams.get("source") as StoreSource | null;
  if (!source || !["shopify", "easyorders", "woocommerce"].includes(source)) {
    return NextResponse.json(
      { error: "source مطلوب: shopify أو easyorders أو woocommerce" },
      { status: 400 }
    );
  }

  const storeId = getStoreId(user, source);
  if (!storeId) return NextResponse.json({ error: "المتجر غير مربوط" }, { status: 404 });

  const storeFilter = buildStoreFilter(source, storeId);

  // ─── جلب الأتمتات الحالية ────────────────────────────────────────────────
  const existing = await prisma.storeAutomation.findMany({
    where: storeFilter,
    include: { template: { select: { id: true, name: true, status: true } } },
  });

  // ─── للأتمتات المخصصة: نجيب القالب المخصص لكل نوع ───────────────────────
  const dedicatedTemplateNames = Object.values(DEDICATED_TEMPLATE_NAMES);
  const dedicatedTemplates = await prisma.template.findMany({
    where: {
      userId: ownerId,
      name: { in: dedicatedTemplateNames },
    },
    select: { id: true, name: true, status: true },
  });

  // Map: templateName → template object
  const dedicatedMap = new Map<string, { id: string; name: string; status: string }>(
    dedicatedTemplates.map((t: { id: string; name: string; status: string }) => [t.name.toLowerCase(), t])
  );

  // ─── للـ promo: كل القوالب المعتمدة ─────────────────────────────────────
  const promoTemplates = await prisma.template.findMany({
    where: { userId: ownerId, status: "APPROVED" },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  // ─── بناء الـ response ───────────────────────────────────────────────────
  const automations = VALID_TYPES.map((type) => {
    const found = existing.find((a: any) => a.type === type);
    const isDedicated = DEDICATED_TYPES.includes(type);

    let dedicatedTemplate: { id: string; name: string; status: string } | null = null;
    if (isDedicated) {
      const expectedName = DEDICATED_TEMPLATE_NAMES[type];
      dedicatedTemplate = dedicatedMap.get(expectedName.toLowerCase()) ?? null;
    }
    return {
      id: found?.id ?? null,
      type,
      isEnabled: found?.isEnabled ?? false,
      templateId: found?.templateId ?? null,
      template: found?.template ?? null,
      sentCount: found?.sentCount ?? 0,
      failedCount: found?.failedCount ?? 0,
      lastSentAt: found?.lastSentAt ?? null,
      // حقول جديدة
      isDedicated,
      dedicatedTemplate, // القالب المخصص (مع status) أو null لو مش موجود
    };
  });

  return NextResponse.json({ automations, templates: promoTemplates });
}

// ── POST ──────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ownerId = resolveOwnerId(session);

  const user = await prisma.user.findUnique({
    where: { id: ownerId },
    select: {
      id: true,
      shopifyStore: { select: { id: true } },
      easyOrdersStore: { select: { id: true } },
      wooCommerceStore: { select: { id: true } },
    },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  let body: { source?: string; type?: string; isEnabled?: boolean; templateId?: string | null };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { source, type, isEnabled = false, templateId = null } = body;

  if (!source || !type) {
    return NextResponse.json({ error: "source و type مطلوبين" }, { status: 400 });
  }
  if (!["shopify", "easyorders", "woocommerce"].includes(source)) {
    return NextResponse.json({ error: "source غير صحيح" }, { status: 400 });
  }
  if (!VALID_TYPES.includes(type as StoreAutomationType)) {
    return NextResponse.json(
      { error: `type غير صحيح، القيم المتاحة: ${VALID_TYPES.join(", ")}` },
      { status: 400 }
    );
  }

  const autoType = type as StoreAutomationType;
  const isDedicated = DEDICATED_TYPES.includes(autoType);

  // ─── للأتمتات المخصصة: التحقق من وجود القالب المخصص وأنه معتمد ───────────
  let resolvedTemplateId = templateId;

  if (isDedicated) {
    const expectedName = DEDICATED_TEMPLATE_NAMES[autoType];
    const dedicatedTemplate = await prisma.template.findFirst({
      where: { userId: ownerId, name: expectedName },
      select: { id: true, status: true, name: true },
    });

    if (!dedicatedTemplate) {
      return NextResponse.json(
        {
          error: `القالب المخصص "${expectedName}" غير موجود — أنشئ قالباً بهذا الاسم على ميتا أولاً`,
          missingTemplate: expectedName,
        },
        { status: 422 }
      );
    }

    if (isEnabled && dedicatedTemplate.status?.toLowerCase() !== "approved") {
      return NextResponse.json(
        {
          error: `القالب "${expectedName}" لم يُعتمد بعد — انتظر اعتماد ميتا قبل التفعيل`,
          templateStatus: dedicatedTemplate.status,
        },
        { status: 422 }
      );
    }

    // استخدام الـ ID المخصص تلقائياً
    resolvedTemplateId = dedicatedTemplate.id;

  } else {
    // promo: التحقق من وجود قالب معتمد مختار
    if (isEnabled && !resolvedTemplateId) {
      return NextResponse.json(
        { error: "اختر قالباً معتمداً من ميتا قبل تفعيل الأتمتة" },
        { status: 422 }
      );
    }

    // التحقق أن القالب المختار معتمد
    if (resolvedTemplateId) {
      const chosen = await prisma.template.findFirst({
        where: { id: resolvedTemplateId, userId: ownerId },
        select: { status: true },
      });
      if (!chosen || chosen.status?.toLowerCase() !== "approved") {
        return NextResponse.json(
          { error: "القالب المختار غير معتمد — اختر قالباً معتمداً فقط" },
          { status: 422 }
        );
      }
    }
  }

  const storeId = getStoreId(user, source as StoreSource);
  if (!storeId) {
    return NextResponse.json({ error: `${source} غير مربوط` }, { status: 404 });
  }

  const whereUnique = buildUniqueWhere(source as StoreSource, storeId, autoType);
  const createPayload = buildCreatePayload(source as StoreSource, storeId, ownerId, autoType, isEnabled, resolvedTemplateId);

  const automation = await prisma.storeAutomation.upsert({
    where: whereUnique,
    update: { isEnabled, templateId: resolvedTemplateId ?? null, updatedAt: new Date() },
    create: createPayload,
    include: { template: { select: { id: true, name: true } } },
  });

  return NextResponse.json({ success: true, automation });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getStoreId(user: any, source: StoreSource): string | undefined {
  if (source === "shopify") return user.shopifyStore?.id;
  if (source === "easyorders") return user.easyOrdersStore?.id;
  if (source === "woocommerce") return user.wooCommerceStore?.id;
}

function buildStoreFilter(source: StoreSource, storeId: string) {
  if (source === "shopify") return { shopifyStoreId: storeId };
  if (source === "easyorders") return { easyOrdersStoreId: storeId };
  return { wooCommerceStoreId: storeId };
}

function buildUniqueWhere(source: StoreSource, storeId: string, type: StoreAutomationType) {
  if (source === "shopify") return { shopifyStoreId_type: { shopifyStoreId: storeId, type } };
  if (source === "easyorders") return { easyOrdersStoreId_type: { easyOrdersStoreId: storeId, type } };
  return { wooCommerceStoreId_type: { wooCommerceStoreId: storeId, type } };
}

function buildCreatePayload(
  source: StoreSource,
  storeId: string,
  userId: string,
  type: StoreAutomationType,
  isEnabled: boolean,
  templateId: string | null
) {
  const base = { userId, type, isEnabled, templateId: templateId ?? null };
  if (source === "shopify") return { ...base, shopifyStoreId: storeId };
  if (source === "easyorders") return { ...base, easyOrdersStoreId: storeId };
  return { ...base, wooCommerceStoreId: storeId };
}