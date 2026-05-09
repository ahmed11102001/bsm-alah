// src/app/api/store/automation/route.ts
// ─── أتمتات المتجر: جلب وحفظ إعدادات التأكيد / الشحن / العروض ───────────────

import { NextRequest, NextResponse } from "next/server";
import { getServerSession }          from "next-auth";
import { authOptions }               from "@/lib/auth";
import prisma                        from "@/lib/prisma";
import { StoreAutomationType }       from "@prisma/client";

// مطابق تماماً لـ enum StoreAutomationType في schema.prisma
const VALID_TYPES: StoreAutomationType[] = [
  StoreAutomationType.order_confirm,
  StoreAutomationType.order_shipped,
  StoreAutomationType.promo,
];

// ── أعضاء الفريق يشاركون متجر الـ owner ─────────────────────────────────────
function resolveOwnerId(session: any): string {
  return (session.user.parentId as string | null) ?? (session.user.id as string);
}

// ── GET — جلب أتمتات المتجر + القوالب المعتمدة ──────────────────────────────
export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ownerId = resolveOwnerId(session);

  const user = await prisma.user.findUnique({
    where:  { id: ownerId },
    select: {
      id:              true,
      shopifyStore:    { select: { id: true } },
      easyOrdersStore: { select: { id: true } },
    },
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const source = new URL(req.url).searchParams.get("source");
  if (!source || !["shopify", "easyorders"].includes(source)) {
    return NextResponse.json({ error: "source مطلوب: shopify أو easyorders" }, { status: 400 });
  }

  const storeId =
    source === "shopify"
      ? user.shopifyStore?.id
      : user.easyOrdersStore?.id;

  if (!storeId) {
    return NextResponse.json({ error: "المتجر غير مربوط" }, { status: 404 });
  }

  // ── نبحث بالـ store ID مش source ────────────────────────────────────────
  const storeFilter =
    source === "shopify"
      ? { shopifyStoreId: storeId }
      : { easyOrdersStoreId: storeId };

  const [existing, templates] = await Promise.all([
    prisma.storeAutomation.findMany({
      where:   storeFilter,
      include: {
        template: { select: { id: true, name: true, status: true } },
      },
    }),
    prisma.template.findMany({
      where:   { userId: ownerId, status: "APPROVED" },
      select:  { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  // ── ضمان وجود الـ 3 أنواع حتى لو ما اتحفظتش بعد ──────────────────────
  const automations = VALID_TYPES.map((type) => {
    const found = existing.find((a) => a.type === type);
    return {
      id:         found?.id          ?? null,
      type,
      isEnabled:  found?.isEnabled   ?? false,
      templateId: found?.templateId  ?? null,
      template:   found?.template    ?? null,
      sentCount:  found?.sentCount   ?? 0,
    };
  });

  return NextResponse.json({ automations, templates });
}

// ── POST — حفظ أو تحديث إعداد أتمتة ────────────────────────────────────────
export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ownerId = resolveOwnerId(session);

  const user = await prisma.user.findUnique({
    where:  { id: ownerId },
    select: {
      id:              true,
      shopifyStore:    { select: { id: true } },
      easyOrdersStore: { select: { id: true } },
    },
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  let body: {
    source?:     string;
    type?:       string;
    isEnabled?:  boolean;
    templateId?: string | null;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { source, type, isEnabled = false, templateId = null } = body;

  if (!source || !type) {
    return NextResponse.json({ error: "source و type مطلوبين" }, { status: 400 });
  }

  if (!VALID_TYPES.includes(type as StoreAutomationType)) {
    return NextResponse.json(
      { error: `type غير صحيح، القيم المتاحة: ${VALID_TYPES.join(", ")}` },
      { status: 400 }
    );
  }

  if (isEnabled && !templateId) {
    return NextResponse.json(
      { error: "اختر قالباً معتمداً من ميتا قبل تفعيل الأتمتة" },
      { status: 422 }
    );
  }

  const autoType = type as StoreAutomationType;

  // ── upsert باستخدام الـ unique constraint الصح ──────────────────────────
  let automation;

  if (source === "shopify") {
    const storeId = user.shopifyStore?.id;
    if (!storeId) {
      return NextResponse.json({ error: "Shopify غير مربوط" }, { status: 404 });
    }

    automation = await prisma.storeAutomation.upsert({
      where: {
        shopifyStoreId_type: { shopifyStoreId: storeId, type: autoType },
      },
      update: {
        isEnabled,
        templateId: templateId ?? null,
        updatedAt:  new Date(),
      },
      create: {
        userId:         ownerId,
        type:           autoType,
        isEnabled,
        templateId:     templateId ?? null,
        shopifyStoreId: storeId,
      },
      include: {
        template: { select: { id: true, name: true } },
      },
    });
  } else if (source === "easyorders") {
    const storeId = user.easyOrdersStore?.id;
    if (!storeId) {
      return NextResponse.json({ error: "EasyOrders غير مربوط" }, { status: 404 });
    }

    automation = await prisma.storeAutomation.upsert({
      where: {
        easyOrdersStoreId_type: { easyOrdersStoreId: storeId, type: autoType },
      },
      update: {
        isEnabled,
        templateId: templateId ?? null,
        updatedAt:  new Date(),
      },
      create: {
        userId:            ownerId,
        type:              autoType,
        isEnabled,
        templateId:        templateId ?? null,
        easyOrdersStoreId: storeId,
      },
      include: {
        template: { select: { id: true, name: true } },
      },
    });
  } else {
    return NextResponse.json({ error: "source غير صحيح" }, { status: 400 });
  }

  return NextResponse.json({ success: true, automation });
}