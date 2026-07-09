// src/app/api/developers/projects/[id]/meta/embedded-signup-complete/route.ts
//
// WhatsApp Embedded Signup — Code Exchange + WABA Discovery, scoped to a
// single Developer Portal project (instead of the main app's single-tenant
// WhatsAppAccount).
//
// Reuses the exact same Meta App (NEXT_PUBLIC_META_APP_ID / META_APP_SECRET /
// NEXT_PUBLIC_META_CONFIG_ID) as the main dashboard's Embedded Signup flow —
// no separate Meta App or Facebook Login Configuration is used here.
//
// The token-exchange + WABA-discovery + webhook-subscribe logic below is
// intentionally identical to src/app/api/meta/embedded-signup-complete/route.ts
// — only the auth check and the DB target differ.

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getDevSessionFromRequest } from "@/lib/dev-auth";
import { getProjectForOwnerOrDeveloper } from "@/lib/dev-project-auth";
import { rateLimit } from "@/lib/rate-limit";
import { encryptToken } from "@/lib/crypto";

const GRAPH_VERSION = process.env.NEXT_PUBLIC_GRAPH_API_VERSION ?? "v22.0";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;

  /* ── 1. Auth check — dev-portal session, not NextAuth ───────────────────── */
  const session = await getDevSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const project = await getProjectForOwnerOrDeveloper(projectId, session.id);
  if (!project) {
    return NextResponse.json({ error: "المشروع مش موجود" }, { status: 404 });
  }

  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  const rl = await rateLimit(`dev-meta-embedded-connect:${ip}`, { limit: 10, windowSecs: 3600 });
  if (!rl.success) {
    return NextResponse.json({ error: "كثير من المحاولات، حاول بعد شوية" }, { status: 429 });
  }

  /* ── 2. Parse body ───────────────────────────────────────────────────────── */
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const {
    code,
    redirect_uri:    rawRedirectUri,
    phone_number_id: rawPhoneId,
    waba_id:         rawWabaId,
  } = body as {
    code?: string;
    redirect_uri?: string;
    phone_number_id?: string;
    waba_id?: string;
  };

  if (!code) {
    return NextResponse.json({ error: "code مطلوب" }, { status: 400 });
  }

  /* ── 3. Exchange code → business token ──────────────────────────────────── */
  // Same Meta App as the main dashboard — do NOT introduce a second App ID
  // or Config ID for the developer portal.
  const appId     = process.env.NEXT_PUBLIC_META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;

  if (!appId || !appSecret) {
    console.error("[DEV-EmbeddedSignup] Missing NEXT_PUBLIC_META_APP_ID or META_APP_SECRET");
    return NextResponse.json(
      { error: "Server configuration error — Meta credentials missing" },
      { status: 500 },
    );
  }

  const redirectUri =
    (rawRedirectUri as string | undefined) ||
    req.headers.get("origin") ||
    "";

  const tokenParams = new URLSearchParams({
    client_id:     appId,
    client_secret: appSecret,
    code,
  });
  if (redirectUri) {
    tokenParams.set("redirect_uri", redirectUri);
  }

  let tokenData: any;
  try {
    const tokenRes = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/oauth/access_token`,
      {
        method:  "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: tokenParams,
      },
    );

    tokenData = await tokenRes.json();

    if (!tokenRes.ok || tokenData.error || !tokenData.access_token) {
      console.error("[DEV-EmbeddedSignup] Token exchange error:", tokenData);
      return NextResponse.json(
        { error: tokenData.error?.message ?? "فشل تبادل الـ code — تأكد من صلاحيته" },
        { status: 502 },
      );
    }
  } catch (err) {
    console.error("[DEV-EmbeddedSignup] Token exchange network error:", err);
    return NextResponse.json(
      { error: "فشل الاتصال بـ Meta — حاول مرة أخرى" },
      { status: 502 },
    );
  }

  const businessToken: string = tokenData.access_token;

  /* ── 4. Resolve WABA ID + Phone Number ID (+ display number) ────────────── */
  let phone_number_id = rawPhoneId as string | undefined;
  let waba_id         = rawWabaId as string | undefined;
  let display_phone_number: string | undefined;

  if (!phone_number_id || !waba_id) {
    try {
      const meRes = await fetch(
        `https://graph.facebook.com/${GRAPH_VERSION}/me/whatsapp_business_accounts` +
          `?fields=id,name,phone_numbers{id,display_phone_number}`,
        { headers: { Authorization: `Bearer ${businessToken}` } },
      );
      const meData = await meRes.json();

      if (meRes.ok && meData.data?.[0]) {
        waba_id          = waba_id ?? meData.data[0].id;
        const firstPhone = meData.data[0].phone_numbers?.data?.[0];
        phone_number_id      = phone_number_id      ?? firstPhone?.id;
        display_phone_number = display_phone_number ?? firstPhone?.display_phone_number;
      }
    } catch (err) {
      console.warn("[DEV-EmbeddedSignup] Strategy A (WABA discovery) failed:", err);
    }
  }

  if (!phone_number_id || !waba_id) {
    try {
      const bizRes = await fetch(
        `https://graph.facebook.com/${GRAPH_VERSION}/me/businesses` +
          `?fields=whatsapp_business_accounts{id,name,phone_numbers{id,display_phone_number}}`,
        { headers: { Authorization: `Bearer ${businessToken}` } },
      );
      const bizData = await bizRes.json();

      const firstBiz  = bizData.data?.[0];
      const firstWaba = firstBiz?.whatsapp_business_accounts?.data?.[0];

      if (firstWaba) {
        waba_id          = waba_id ?? firstWaba.id;
        const firstPhone = firstWaba.phone_numbers?.data?.[0];
        phone_number_id      = phone_number_id      ?? firstPhone?.id;
        display_phone_number = display_phone_number ?? firstPhone?.display_phone_number;
      }
    } catch (err) {
      console.warn("[DEV-EmbeddedSignup] Strategy B (businesses fallback) failed:", err);
    }
  }

  if (!phone_number_id || !waba_id) {
    console.error("[DEV-EmbeddedSignup] Could not resolve WABA/Phone — rawPhoneId:", rawPhoneId, "rawWabaId:", rawWabaId);
    return NextResponse.json(
      { error: "لم نتمكن من الحصول على WABA ID أو Phone Number ID — حاول مرة أخرى" },
      { status: 502 },
    );
  }

  /* ── 5. Subscribe webhooks on the customer's WABA ───────────────────────── */
  let webhookSubscribed = false;
  try {
    const subRes = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/${waba_id}/subscribed_apps`,
      {
        method:  "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ access_token: businessToken }),
      },
    );
    const subData = await subRes.json();
    webhookSubscribed = subData.success === true;

    if (!subRes.ok || subData.error) {
      console.warn("[DEV-EmbeddedSignup] Webhook subscription warning:", subData);
    }
  } catch (err) {
    console.warn("[DEV-EmbeddedSignup] Webhook subscription network error:", err);
  }

  /* ── 6. Save encrypted token + IDs, scoped to this project ──────────────── */
  const encryptedToken = encryptToken(businessToken);

  try {
    await prisma.developerMetaConnection.upsert({
      where: { projectId },
      update: {
        accessToken:   encryptedToken,
        phoneNumberId: phone_number_id,
        wabaId:        waba_id,
        displayPhone:  display_phone_number || "",
        isVerified:    true,
        updatedAt:     new Date(),
      },
      create: {
        projectId,
        accessToken:   encryptedToken,
        phoneNumberId: phone_number_id,
        wabaId:        waba_id,
        displayPhone:  display_phone_number || "",
        isVerified:    true,
      },
    });
  } catch (err) {
    console.error("[DEV-EmbeddedSignup] DB upsert error:", err);
    return NextResponse.json({ error: "فشل حفظ البيانات — حاول مرة أخرى" }, { status: 500 });
  }

  /* ── 7. Return success (no token in response!) ──────────────────────────── */
  return NextResponse.json({
    success: true,
    phone_number_id,
    waba_id,
    display_phone_number,
    webhookSubscribed,
  });
}
