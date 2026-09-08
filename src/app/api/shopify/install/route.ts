// src/app/api/shopify/install/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession }          from "next-auth";
import { authOptions }               from "@/lib/auth";
import prisma                        from "@/lib/prisma";
import { generateShopifyWebhookUrl } from "@/app/api/shopify/webhooks/route";
import { encryptToken }              from "@/lib/crypto";
import { SHOPIFY_API_VERSION }       from "@/lib/shopify-api";
import { normalizeShopDomain }       from "@/lib/shopify-domain";
import {
  getShopifyAuthMethod,
  getValidShopifyAccessToken,
  requestClientCredentialsToken,
} from "@/lib/shopify-auth";
import { requirePermission } from "@/lib/permissions";

// الـ topics اللي محتاجينها — بالترتيب الصح
const REQUIRED_TOPICS = [
  "orders/create",
  "orders/updated",
  "orders/fulfilled",
  "checkouts/create",   // ← السلة المهجورة
  "checkouts/update",   // ← السلة المهجورة (يجي أكتر من مرة)
  "customers/create",
  "customers/update",
  "app/uninstalled",    // ← التاجر شال التطبيق — يوقف استخدام التوكن فورًا
] as const;

// ── GDPR الإجبارية — شرط لأي Public App، لكن مش بتتسجل هنا ─────────────────
// شوبيفاي بترفض تسجيل الـ3 topics دول عبر REST /webhooks.json العادي (بترجع
// "invalid topic"). لازم تتسجل *مرة واحدة* من Partner Dashboard → App →
// Configuration → Compliance webhooks (أو shopify.app.toml لو بتستخدموا الـCLI)،
// بـURL واحد مشترك لكل التجار: {APP_URL}/api/shopify/compliance — مش هنا،
// لأن ده URL فيه uid مختلف لكل تاجر ومفيش uid يتحدد مقدمًا لحدث زي ده.
// المعالجة الفعلية في src/app/api/shopify/compliance/route.ts.
//
// والمعالج يرد دائمًا 200 حتى لو فشل داخليًا (شرط شوبيفاي).
// القايمة هنا للتوثيق بس — متتحطش في REQUIRED_TOPICS ولا في أي loop تسجيل REST.
const MANDATORY_GDPR_TOPICS_SET_MANUALLY_IN_PARTNER_DASHBOARD = [
  "customers/data_request",
  "customers/redact",
  "shop/redact",
] as const;
void MANDATORY_GDPR_TOPICS_SET_MANUALLY_IN_PARTNER_DASHBOARD; // توثيق فقط

// ── تنظيف وتوحيد الدومين — منطق مشترك في src/lib/shopify-domain.ts (مستورد أعلى الملف) ──

// ── التحقق من الدومين ──────────────────────────────────────────────────────────
async function verifyShopifyDomain(domain: string): Promise<boolean> {
  try {
    const res = await fetch(`https://${domain}/robots.txt`, {
      method:  "HEAD",
      redirect: "follow",
      signal:  AbortSignal.timeout(8_000),
      headers: { "User-Agent": "WANI-Verify/1.0" },
    });
    return res.status < 500;
  } catch {
    return false;
  }
}

// ── تسجيل webhook واحد في Shopify API ────────────────────────────────────────
async function registerWebhook(
  shop:        string,
  accessToken: string,
  topic:       string,
  address:     string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(
      `https://${shop}/admin/api/${SHOPIFY_API_VERSION}/webhooks.json`,
      {
        method:  "POST",
        headers: {
          "Content-Type":          "application/json",
          "X-Shopify-Access-Token": accessToken,
        },
        body: JSON.stringify({
          webhook: { topic, address, format: "json" },
        }),
        signal: AbortSignal.timeout(10_000),
      }
    );

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      // 422 = webhook already exists → مش error حقيقي
      if (res.status === 422) return { ok: true };
      return { ok: false, error: body?.errors?.address?.[0] ?? `HTTP ${res.status}` };
    }

    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message ?? "network error" };
  }
}

// ── تسجيل كل الـ webhooks المطلوبة (تجارية + GDPR الإجبارية) ────────────────
export async function registerAllWebhooks(
  shop:        string,
  accessToken: string,
  webhookUrl:  string,
): Promise<{ registered: string[]; failed: string[] }> {
  const registered: string[] = [];
  const failed:     string[] = [];

  for (const topic of REQUIRED_TOPICS) {
    const result = await registerWebhook(shop, accessToken, topic, webhookUrl);
    if (result.ok) {
      registered.push(topic);
      console.log(`[Shopify Webhooks] ✓ ${topic}`);
    } else {
      failed.push(topic);
      console.error(`[Shopify Webhooks] ✗ ${topic} — ${result.error}`);
    }
  }

  return { registered, failed };
}

// ── التحقق من صحة الـ Access Token عبر Shopify API ───────────────────────────
async function verifyAccessToken(shop: string, token: string): Promise<boolean> {
  try {
    const res = await fetch(
      `https://${shop}/admin/api/${SHOPIFY_API_VERSION}/shop.json`,
      {
        headers: { "X-Shopify-Access-Token": token },
        signal:  AbortSignal.timeout(8_000),
      }
    );
    return res.ok;
  } catch {
    return false;
  }
}

// ─── POST — ربط متجر Shopify + تسجيل Webhooks تلقائياً ───────────────────────
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    const denied = requirePermission(session, "STORE_INTEGRATIONS_MANAGE");

    if (denied) return denied;

    const body = await req.json();
    const { storeName, shopDomain, accessToken, clientId, clientSecret } = body as {
      storeName?:    string;
      shopDomain?:   string;
      accessToken?:  string;
      clientId?:     string;
      clientSecret?: string;
    };

    if (!storeName?.trim())
      return NextResponse.json({ error: "اسم المتجر مطلوب" }, { status: 400 });

    if (!shopDomain?.trim())
      return NextResponse.json(
        { error: "دومين Shopify مطلوب — بصيغة متجر.myshopify.com" },
        { status: 400 }
      );

    // ── Normalize ويتحقق من الدومين دايماً (مفيش تخمين من اسم المتجر) ────────
    const normalized = normalizeShopDomain(shopDomain);
    if (!normalized)
      return NextResponse.json(
        { error: "الدومين غير صالح — يجب أن يكون بصيغة متجر.myshopify.com" },
        { status: 400 }
      );

    const exists = await verifyShopifyDomain(normalized);
    if (!exists)
      return NextResponse.json(
        { error: `المتجر "${normalized}" غير موجود على Shopify — تحقق من الاسم` },
        { status: 422 }
      );

    const verifiedDomain: string = normalized;

    const dbUser = await prisma.user.findUnique({
      where:  { email: session!.user.email },
      select: { id: true, parentId: true },
    });
    if (!dbUser)
      return NextResponse.json({ error: "المستخدم غير موجود" }, { status: 404 });

    const userId = dbUser.parentId ?? dbUser.id;

    // ── تحقق مش متجر مسجل بحساب تاني ──────────────────────────────────────
    const existingStore = await prisma.shopifyStore.findFirst({
      where: { shop: verifiedDomain, userId: { not: userId } },
    });
    if (existingStore)
      return NextResponse.json(
        { error: "هذا المتجر مرتبط بحساب آخر بالفعل" },
        { status: 409 }
      );

    // ── بيانات الاعتماد: legacy token أو (clientId + clientSecret) ─────────
    // - مجموعة واحدة كافية، والاتنين مع بعض مقبولين (الأولوية للدائم).
    // - مجموعة ناقصة (clientId من غير secret أو العكس) → 400.
    // - لا شيء إطلاقًا → مسموح (ربط يدوي بالـ webhooks فقط، زي قبل كده).
    const cleanToken        = accessToken?.trim()  || null;
    const cleanClientId     = clientId?.trim()     || null;
    const cleanClientSecret = clientSecret?.trim() || null;

    if ((cleanClientId && !cleanClientSecret) || (!cleanClientId && cleanClientSecret))
      return NextResponse.json(
        { error: "ابعت Client ID و Client Secret مع بعض — المجموعة ناقصة" },
        { status: 400 }
      );

    const hasLegacy = !!cleanToken;
    const hasCC     = !!(cleanClientId && cleanClientSecret);

    // ── التحقق من الصحة قبل الحفظ ─────────────────────────────────────────
    if (hasLegacy) {
      const tokenValid = await verifyAccessToken(verifiedDomain, cleanToken!);
      if (!tokenValid)
        return NextResponse.json(
          { error: "الـ Access Token غير صحيح أو منتهي — تحقق من صلاحيات الـ Custom App" },
          { status: 422 }
        );
    }

    // توكن مؤقت مُتحقق منه — بيتخزن في الكاش عند الحفظ لتفادي نداء مضاعف
    let verifiedCC: { accessToken: string; expiresAt: Date } | null = null;
    if (hasCC) {
      const exchanged = await requestClientCredentialsToken(
        verifiedDomain, cleanClientId!, cleanClientSecret!
      );
      if (!exchanged)
        return NextResponse.json(
          { error: "Client ID/Secret غلط أو الـ App مش متثبتة على المتجر — تأكد إن الـ App والمتجر في نفس الـ organization" },
          { status: 422 }
        );
      verifiedCC = {
        accessToken: exchanged.accessToken,
        expiresAt:   new Date(Date.now() + exchanged.expiresIn * 1000),
      };
    }

    // ── حفظ المتجر ──────────────────────────────────────────────────────────
    // القاعدة: المجموعة المبعوتة صراحةً بتتبدل، والمجموعة التانية بتتمسح فقط
    // لو اتبعتت مجموعة جديدة مكانها — لو لم يُبعث شيء تُحفظ القيم القديمة.
    // (الأولوية عند القراءة للتوكن الدائم — راجع src/lib/shopify-auth.ts)
    const ownStore = await prisma.shopifyStore.findUnique({ where: { userId } });
    const savedStore = await prisma.shopifyStore.upsert({
      where:  { userId },
      update: {
        shop:        verifiedDomain,
        storeName:   storeName.trim(),
        isActive:    true,
        accessToken:  hasLegacy ? encryptToken(cleanToken!)  : (!hasCC ? (ownStore?.accessToken ?? null)  : null),
        clientId:     hasCC     ? cleanClientId!             : (!hasLegacy ? (ownStore?.clientId ?? null) : null),
        clientSecret: hasCC     ? encryptToken(cleanClientSecret!) : (!hasLegacy ? (ownStore?.clientSecret ?? null) : null),
        cachedAccessToken:    hasCC && verifiedCC ? encryptToken(verifiedCC.accessToken) : (!hasLegacy && !hasCC ? (ownStore?.cachedAccessToken ?? null) : null),
        cachedTokenExpiresAt: hasCC && verifiedCC ? verifiedCC.expiresAt : (!hasLegacy && !hasCC ? (ownStore?.cachedTokenExpiresAt ?? null) : null),
        updatedAt:   new Date(),
      },
      create: {
        userId,
        shop:        verifiedDomain,
        storeName:   storeName.trim(),
        isActive:    true,
        accessToken:  hasLegacy ? encryptToken(cleanToken!) : null,
        clientId:     hasCC ? cleanClientId! : null,
        clientSecret: hasCC ? encryptToken(cleanClientSecret!) : null,
        cachedAccessToken:    hasCC && verifiedCC ? encryptToken(verifiedCC.accessToken) : null,
        cachedTokenExpiresAt: hasCC && verifiedCC ? verifiedCC.expiresAt : null,
      },
    });

    const webhookUrl = generateShopifyWebhookUrl(userId);

    // ── تسجيل الـ webhooks ومزامنة المنتجات تلقائياً لو في توكن صالح ──────────
    // التوكن بيتحل عبر getValidShopifyAccessToken (دائم أو مؤقت متجدد) بدل
    // القراءة المباشرة — المتاجر القديمة سلوكها كما هو تمامًا.
    let webhooksResult: { registered: string[]; failed: string[] } | null = null;
    let hasProductScope = false;
    const resolvedToken = await getValidShopifyAccessToken(savedStore);
    if (resolvedToken) {
      webhooksResult = await registerAllWebhooks(verifiedDomain, resolvedToken, webhookUrl);

      // Check for read_products scope & trigger sync
      const { verifyShopifyProductScope } = await import("@/lib/shopify-api");
      const scopeCheck = await verifyShopifyProductScope(verifiedDomain, resolvedToken);
      hasProductScope = scopeCheck.hasProductScope;

      if (hasProductScope) {
        const { inngest } = await import("@/inngest/client");
        void inngest.send({
          name: "product/sync.requested",
          data: { userId, source: "shopify" },
        }).catch(err => console.error("[Shopify Connect] Failed to trigger product sync", err));
      }
    }

    return NextResponse.json({
      success:     true,
      storeName:   storeName.trim(),
      domain:      verifiedDomain,
      webhookUrl,
      authMethod:  getShopifyAuthMethod(savedStore),
      hasProductScope,
      webhooks:    webhooksResult
        ? {
            registered: webhooksResult.registered.length,
            failed:     webhooksResult.failed,
            autoSetup:  webhooksResult.failed.length === 0,
          }
        : null,
    });

  } catch (error) {
    console.error("[Shopify Install] Error:", error);
    return NextResponse.json({ error: "حدث خطأ غير متوقع" }, { status: 500 });
  }
}

// ─── DELETE — فك ربط المتجر ───────────────────────────────────────────────────
// بيمسح الصف كله: accessToken + clientId + clientSecret + الكاش مع بعض.
export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);

    const denied = requirePermission(session, "STORE_INTEGRATIONS_MANAGE");

    if (denied) return denied;

    const dbUser = await prisma.user.findUnique({
      where:  { email: session!.user.email },
      select: { id: true, parentId: true },
    });
    if (!dbUser)
      return NextResponse.json({ error: "User not found" }, { status: 404 });

    const userId = dbUser.parentId ?? dbUser.id;
    await prisma.shopifyStore.deleteMany({ where: { userId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Shopify Delete] Error:", error);
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 });
  }
}