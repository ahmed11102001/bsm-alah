// src/app/api/store/automation/route.ts
// ─── أتمتات المتجر: Shopify + EasyOrders + WooCommerce ───────────────────────

import { NextRequest, NextResponse } from "next/server";
import { getServerSession }          from "next-auth";
import { authOptions }               from "@/lib/auth";
import prisma                        from "@/lib/prisma";
// StoreAutomationType defined locally to avoid Prisma client generation dependency

type StoreAutomationType = "order_confirm" | "order_shipped" | "promo";
const VALID_TYPES: StoreAutomationType[] = ["order_confirm", "order_shipped", "promo"];

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
    where:  { id: ownerId },
    select: {
      id:               true,
      shopifyStore:     { select: { id: true } },
      easyOrdersStore:  { select: { id: true } },
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

  const [existing, templates] = await Promise.all([
    prisma.storeAutomation.findMany({
      where:   storeFilter,
      include: { template: { select: { id: true, name: true, status: true } } },
    }),
    prisma.template.findMany({
      where:   { userId: ownerId, status: "APPROVED" },
      select:  { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const automations = VALID_TYPES.map((type) => {
    const found = existing.find((a: any) => a.type === type);
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

// ── POST ──────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ownerId = resolveOwnerId(session);

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
  if (isEnabled && !templateId) {
    return NextResponse.json(
      { error: "اختر قالباً معتمداً من ميتا قبل تفعيل الأتمتة" },
      { status: 422 }
    );
  }

  const storeId = getStoreId(user, source as StoreSource);
  if (!storeId) {
    return NextResponse.json({ error: `${source} غير مربوط` }, { status: 404 });
  }

  const autoType      = type as StoreAutomationType;
  const whereUnique   = buildUniqueWhere(source as StoreSource, storeId, autoType);
  const createPayload = buildCreatePayload(source as StoreSource, storeId, ownerId, autoType, isEnabled, templateId);

  const automation = await prisma.storeAutomation.upsert({
    where:  whereUnique,
    update: { isEnabled, templateId: templateId ?? null, updatedAt: new Date() },
    create: createPayload,
    include: { template: { select: { id: true, name: true } } },
  });

  return NextResponse.json({ success: true, automation });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getStoreId(user: any, source: StoreSource): string | undefined {
  if (source === "shopify")     return user.shopifyStore?.id;
  if (source === "easyorders")  return user.easyOrdersStore?.id;
  if (source === "woocommerce") return user.wooCommerceStore?.id;
}

function buildStoreFilter(source: StoreSource, storeId: string) {
  if (source === "shopify")     return { shopifyStoreId:     storeId };
  if (source === "easyorders")  return { easyOrdersStoreId:  storeId };
  return                               { wooCommerceStoreId: storeId };
}

function buildUniqueWhere(source: StoreSource, storeId: string, type: StoreAutomationType) {
  if (source === "shopify")     return { shopifyStoreId_type:     { shopifyStoreId:     storeId, type } };
  if (source === "easyorders")  return { easyOrdersStoreId_type:  { easyOrdersStoreId:  storeId, type } };
  return                               { wooCommerceStoreId_type: { wooCommerceStoreId: storeId, type } };
}

function buildCreatePayload(
  source:     StoreSource,
  storeId:    string,
  userId:     string,
  type:       StoreAutomationType,
  isEnabled:  boolean,
  templateId: string | null
) {
  const base = { userId, type, isEnabled, templateId: templateId ?? null };
  if (source === "shopify")     return { ...base, shopifyStoreId:     storeId };
  if (source === "easyorders")  return { ...base, easyOrdersStoreId:  storeId };
  return                               { ...base, wooCommerceStoreId: storeId };
}