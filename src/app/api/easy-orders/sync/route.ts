// src/app/api/easy-orders/sync/route.ts
// ─── ربط متجر EasyOrders والتحقق من الـ Public API Key ──────────────────────
//
// ملاحظة مهمة: الـ Public API الحالي لـ EasyOrders لا يوفر endpoint لسحب كل
// الطلبات دفعة واحدة (لا يوجد GET /orders?page=... موثّق). لذلك هذا الراوت
// لم يعد يجلب طلبات على الإطلاق — الطلبات تصل حصريًا عبر الـ Webhook
// (src/app/api/easy-orders/webhooks/route.ts).
//
// هذا الراوت مسؤول فقط عن:
//   1. التحقق من صحة الـ Public API Key (validate-before-save).
//   2. حفظ/تحديث بيانات المتجر بعد التحقق الناجح فقط.
//   3. إطلاق مزامنة المنتجات (فورية + في الخلفية عبر Inngest للمرات القادمة).
//
// PATCH يُستخدم لحفظ الـ Webhook Secret بشكل منفصل تمامًا عن الـ API Key
// (EasyOrders يولّد Webhook Secret مستقل عند إنشاء الـ Webhook من الداشبورد).

import { NextRequest, NextResponse } from "next/server";
import { getServerSession }          from "next-auth";
import { authOptions }               from "@/lib/auth";
import prisma                        from "@/lib/prisma";
import { decryptToken, encryptToken, isEncrypted } from "@/lib/crypto";
import { requirePermission }         from "@/lib/permissions";
import { syncEasyOrdersProducts }    from "@/lib/product-sync";

const EASYORDERS_PRODUCTS_ENDPOINT = "https://api.easy-orders.net/api/v1/external-apps/products";

type ValidationResult =
  | { ok: true }
  | { ok: false; status: number; code: string; message: string; details?: unknown };

function safeResponseDetails(text: string): unknown {
  const trimmed = text.trim();
  if (!trimmed) return undefined;

  // Keep logs/responses bounded. EasyOrders error bodies should be small, but
  // this prevents an unexpectedly large upstream response from flooding logs/UI.
  const bounded = trimmed.slice(0, 2000);
  try {
    return JSON.parse(bounded);
  } catch {
    return bounded;
  }
}

/**
 * يتحقق من الـ API Key عن طريق نداء فعلي لـ GET products بحد أقصى منتج واحد.
 * لا يفترض نجاح العملية لمجرد إمكانية حفظ المفتاح — ينادي EasyOrders فعليًا
 * ويفرّق بين أنواع الأخطاء المختلفة.
 *
 * مهم: نقرأ body الخاص بـEasyOrders عند الفشل ونحتفظ به في details، لأن
 * status=400 وحده لا يوضح سبب رفض الطلب. الـAPI Key نفسه لا يتم تسجيله أو
 * إرجاعه أبدًا.
 */
async function validateEasyOrdersApiKey(apiKey: string): Promise<ValidationResult> {
  try {
    const res = await fetch(`${EASYORDERS_PRODUCTS_ENDPOINT}?page=1&limit=1`, {
      headers: {
        "Api-Key": apiKey,
        "Accept": "application/json",
      },
      signal: AbortSignal.timeout(15_000),
    });

    if (res.ok) return { ok: true };

    const responseText = await res.text();
    const details = safeResponseDetails(responseText);

    if (res.status === 401) {
      return {
        ok: false,
        status: 401,
        code: "invalid_api_key",
        message: "API Key غير صحيح",
        details,
      };
    }
    if (res.status === 403) {
      return {
        ok: false,
        status: 403,
        code: "insufficient_permissions",
        message: "الـ API Key لا يملك صلاحية products:read — راجع صلاحيات المفتاح في داشبورد EasyOrders",
        details,
      };
    }
    if (res.status === 400) {
      return {
        ok: false,
        status: 400,
        code: "bad_request",
        message: "EasyOrders رفضت طلب التحقق (400). راجع تفاصيل الخطأ المرفقة.",
        details,
      };
    }
    if (res.status === 404) {
      return {
        ok: false,
        status: 404,
        code: "not_found",
        message: "المتجر أو الـ endpoint غير موجود",
        details,
      };
    }
    if (res.status === 429) {
      return {
        ok: false,
        status: 429,
        code: "rate_limited",
        message: "تم تجاوز الحد المسموح من الطلبات، حاول لاحقًا",
        details,
      };
    }
    return {
      ok: false,
      status: res.status,
      code: "easyorders_error",
      message: `خطأ من EasyOrders API: ${res.status}`,
      details,
    };
  } catch (err: unknown) {
    const isTimeout = err instanceof Error && err.name === "TimeoutError";
    console.error("[EasyOrders] Connection validation failed:", isTimeout ? "timeout" : "network error");
    return {
      ok: false,
      status: 0,
      code: isTimeout ? "timeout" : "network_error",
      message: isTimeout ? "انتهت مهلة الاتصال بـ EasyOrders" : "تعذر الاتصال بـ EasyOrders API",
    };
  }
}

// ─── GET — حالة الربط الحالية ─────────────────────────────────────────────
export async function GET(): Promise<NextResponse> {
  const session = await getServerSession(authOptions);

  const denied = requirePermission(session, "STORE_INTEGRATIONS_MANAGE");
  if (denied) return denied;

  const user = await prisma.user.findUnique({
    where:  { email: session!.user.email },
    select: {
      id:              true,
      easyOrdersStore: {
        select: {
          storeName:     true,
          totalSynced:   true,
          lastSyncAt:    true,
          isActive:      true,
          webhookSecret: true,
        },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (!user.easyOrdersStore) {
    return NextResponse.json({ connected: false });
  }

  const { storeName, totalSynced, lastSyncAt, isActive, webhookSecret } = user.easyOrdersStore;

  return NextResponse.json({
    connected:         true,
    storeName,
    totalSynced,
    lastSyncAt,
    isActive,
    webhookConfigured: Boolean(webhookSecret),
  });
}

// ─── POST — التحقق من الـ API Key + ربط المتجر + مزامنة المنتجات ───────────
//
// body:
//   { apiKey, storeName }         → أول ربط (أو تحديث الـ API Key)
//   { reuseStoredKey: true }      → إعادة مزامنة المنتجات يدويًا بالمفتاح المحفوظ
export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions);

  const denied = requirePermission(session, "STORE_INTEGRATIONS_MANAGE");
  if (denied) return denied;

  const user = await prisma.user.findUnique({
    where:  { email: session!.user.email },
    select: {
      id:              true,
      easyOrdersStore: {
        select: { id: true, apiKey: true, storeName: true, totalSynced: true },
      },
    },
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  let body: {
    apiKey?:         string;
    storeName?:      string;
    reuseStoredKey?: boolean;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { storeName, reuseStoredKey = false } = body;

  let apiKey: string;

  if (reuseStoredKey) {
    if (!user.easyOrdersStore?.apiKey) {
      return NextResponse.json(
        { error: "لا يوجد API Key محفوظ، يرجى ربط المتجر أولاً" },
        { status: 422 }
      );
    }
    apiKey = isEncrypted(user.easyOrdersStore.apiKey)
      ? decryptToken(user.easyOrdersStore.apiKey)
      : user.easyOrdersStore.apiKey;
  } else {
    if (!body.apiKey?.trim()) {
      return NextResponse.json({ error: "apiKey مطلوب" }, { status: 400 });
    }
    apiKey = body.apiKey.trim();
  }

  console.log("[EasyOrders] Connection validation started");
  const validation = await validateEasyOrdersApiKey(apiKey);

  if (!validation.ok) {
    console.warn("[EasyOrders] Connection validation failed", {
      code: validation.code,
      status: validation.status,
      details: validation.details,
    });

    return NextResponse.json(
      {
        error: validation.message,
        code: validation.code,
        details: validation.details,
      },
      { status: validation.status === 0 ? 502 : (validation.status === 429 ? 429 : 422) }
    );
  }
  console.log("[EasyOrders] Connection validation succeeded");

  const store = await prisma.easyOrdersStore.upsert({
    where:  { userId: user.id },
    update: {
      ...(reuseStoredKey ? {} : { apiKey: encryptToken(apiKey) }),
      ...(storeName?.trim() ? { storeName: storeName.trim() } : {}),
      isActive: true,
    },
    create: {
      userId:    user.id,
      apiKey:    encryptToken(apiKey),
      storeName: storeName?.trim() || "متجري",
    },
  });

  console.log("[EasyOrders] Product sync started");
  let productSync;
  try {
    productSync = await syncEasyOrdersProducts(user.id, apiKey);
  } catch (err: unknown) {
    console.error("[EasyOrders] Product sync failed unexpectedly:", err);
    productSync = { synced: 0, errors: 1, deactivated: 0, errorMessage: "Unknown error" };
  }

  if (productSync.errorMessage || productSync.errors > 0) {
    console.warn(`[EasyOrders] Product sync failed: synced=${productSync.synced} errors=${productSync.errors}`);
  }

  try {
    const { inngest } = await import("@/inngest/client");
    void inngest.send({
      name: "product/sync.requested",
      data: { userId: user.id, source: "easyorders" },
    }).catch(err => console.error("[EasyOrders] Failed to schedule background product sync", err));
  } catch {
    // non-blocking
  }

  return NextResponse.json({
    success:          true,
    connected:        true,
    storeName:        store.storeName,
    productsSynced:   productSync.synced,
    productSyncError: productSync.errorMessage ?? (productSync.errors > 0 ? "بعض المنتجات فشلت أثناء المزامنة" : null),
  });
}

// ─── PATCH — حفظ Webhook Secret بشكل منفصل عن الـ API Key ──────────────────
export async function PATCH(req: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions);

  const denied = requirePermission(session, "STORE_INTEGRATIONS_MANAGE");
  if (denied) return denied;

  const user = await prisma.user.findUnique({
    where:  { email: session!.user.email },
    select: { id: true, easyOrdersStore: { select: { id: true } } },
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  if (!user.easyOrdersStore) {
    return NextResponse.json({ error: "يجب ربط المتجر أولاً قبل حفظ الـ Webhook Secret" }, { status: 422 });
  }

  let body: { webhookSecret?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.webhookSecret?.trim()) {
    return NextResponse.json({ error: "webhookSecret مطلوب" }, { status: 400 });
  }

  await prisma.easyOrdersStore.update({
    where: { id: user.easyOrdersStore.id },
    data:  { webhookSecret: encryptToken(body.webhookSecret.trim()) },
  });

  return NextResponse.json({ success: true, webhookConfigured: true });
}

// ─── DELETE — فك ربط المتجر ───────────────────────────────────────────────────
export async function DELETE(): Promise<NextResponse> {
  const session = await getServerSession(authOptions);

  const denied = requirePermission(session, "STORE_INTEGRATIONS_MANAGE");
  if (denied) return denied;

  const dbUser = await prisma.user.findUnique({
    where:  { email: session!.user.email },
    select: { id: true, parentId: true },
  });
  if (!dbUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const userId = dbUser.parentId ?? dbUser.id;

  try {
    await prisma.easyOrdersStore.deleteMany({ where: { userId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[EasyOrders Delete] Error:", error);
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 });
  }
}