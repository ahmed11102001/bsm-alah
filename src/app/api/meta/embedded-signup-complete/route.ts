// src/app/api/meta/embedded-signup-complete/route.ts
// ─── WhatsApp Embedded Signup — Code Exchange + WABA Discovery ────────────────
//
// Receives the short-lived `code` from FB.login (and optionally phone_number_id
// + waba_id from the message event), exchanges it for a long-lived business
// token, subscribes webhooks on the customer's WABA, and saves everything
// (encrypted) in the DB.
//
// The business token is NEVER sent back to the frontend.
//
// FIX: `redirect_uri` is now accepted from the request body and passed to the
// Meta token-exchange endpoint — Meta requires it to match what was sent in
// FB.login extras.  Without it the exchange silently fails and returns no token.
//
// NOTE: WABA discovery uses Strategy A only (/me/whatsapp_business_accounts).
// The old /me/businesses fallback (Strategy B) was removed because it depends on
// the `business_management` permission — if auto-discovery fails, the user is
// directed to the manual connect form (Access Token + Phone Number ID + WABA ID).

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { encryptToken } from "@/lib/crypto";
import { GRAPH_API_VERSION as GRAPH_VERSION } from "@/lib/meta-graph";

export async function POST(req: NextRequest) {
  /* ── 1. Auth check ───────────────────────────────────────────────────────── */
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "غير مصرح لك" }, { status: 401 });
  }
  const ownerId =
    ((session.user as any).parentId as string | null) ??
    (session.user as any).id;

  /* ── 2. Parse body ───────────────────────────────────────────────────────── */
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const {
    code,
    redirect_uri: rawRedirectUri,
    phone_number_id: rawPhoneId,
    waba_id: rawWabaId,
  } = body as {
    code?: string;
    redirect_uri?: string;
    phone_number_id?: string;
    waba_id?: string;
  };

  console.log("[EmbeddedSignup][BACKEND DIAGNOSTIC] Incoming request received:", {
    ownerId,
    hasCode: !!code,
    hasRawRedirectUri: !!rawRedirectUri,
    rawRedirectUri,
    hasPhoneId: !!rawPhoneId,
    rawPhoneId,
    hasWabaId: !!rawWabaId,
    rawWabaId,
  });

  if (!code) {
    console.warn("[EmbeddedSignup][BACKEND DIAGNOSTIC] Validation failed: code is missing");
    return NextResponse.json({ error: "code مطلوب" }, { status: 400 });
  }

  /* ── 3. Exchange code → business token ──────────────────────────────────── */
  const appId = process.env.NEXT_PUBLIC_META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;

  if (!appId || !appSecret) {
    console.error("[EmbeddedSignup][BACKEND DIAGNOSTIC] Missing NEXT_PUBLIC_META_APP_ID or META_APP_SECRET");
    return NextResponse.json(
      { error: "Server configuration error — Meta credentials missing" },
      { status: 500 },
    );
  }

  const redirectUri =
    (rawRedirectUri as string | undefined) ||
    req.headers.get("origin") ||
    "";

  // Build token-exchange params
  const tokenParams = new URLSearchParams({
    client_id: appId,
    client_secret: appSecret,
    code,
  });
  if (redirectUri) {
    tokenParams.set("redirect_uri", redirectUri);
  }

  console.log("[EmbeddedSignup][BACKEND DIAGNOSTIC] Initiating Meta token exchange with redirect_uri:", redirectUri);

  let tokenData: any;
  try {
    const tokenRes = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/oauth/access_token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: tokenParams,
      },
    );

    tokenData = await tokenRes.json();

    console.log("[EmbeddedSignup][BACKEND DIAGNOSTIC] Meta token exchange result:", {
      status: tokenRes.status,
      ok: tokenRes.ok,
      hasAccessToken: !!tokenData?.access_token,
      tokenType: tokenData?.token_type,
      errorCode: tokenData?.error?.code,
      errorSubcode: tokenData?.error?.error_subcode,
      errorMessage: tokenData?.error?.message,
    });

    if (!tokenRes.ok || tokenData.error || !tokenData.access_token) {
      // Auto-fallback: If Meta rejected the exchange due to redirect_uri mismatch, retry without redirect_uri
      if (redirectUri && (tokenData?.error?.code === 100 || tokenData?.error?.error_subcode === 36008 || tokenData?.error?.message?.toLowerCase().includes("redirect_uri"))) {
        console.log("[EmbeddedSignup][BACKEND DIAGNOSTIC] Retrying token exchange without redirect_uri parameter...");
        const retryParams = new URLSearchParams({
          client_id: appId,
          client_secret: appSecret,
          code,
        });
        const retryRes = await fetch(
          `https://graph.facebook.com/${GRAPH_VERSION}/oauth/access_token`,
          {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: retryParams,
          },
        );
        const retryData = await retryRes.json();
        if (retryRes.ok && retryData.access_token) {
          console.log("[EmbeddedSignup][BACKEND DIAGNOSTIC] Token exchange retry succeeded!");
          tokenData = retryData;
        } else {
          console.error("[EmbeddedSignup] Token exchange error after retry:", retryData?.error || tokenData?.error);
          return NextResponse.json(
            {
              error: retryData.error?.message ?? tokenData.error?.message ?? "فشل تبادل الـ code — تأكد من صلاحيته",
            },
            { status: 502 },
          );
        }
      } else {
        console.error("[EmbeddedSignup] Token exchange error:", tokenData?.error || "No access token");
        return NextResponse.json(
          {
            error: tokenData.error?.message ?? "فشل تبادل الـ code — تأكد من صلاحيته",
          },
          { status: 502 },
        );
      }
    }
  } catch (err: any) {
    console.error("[EmbeddedSignup][BACKEND DIAGNOSTIC] Token exchange network error:", err?.message || err);
    return NextResponse.json(
      { error: "فشل الاتصال بـ Meta — حاول مرة أخرى" },
      { status: 502 },
    );
  }

  const businessToken: string = tokenData.access_token;

  /* ── 4. Resolve WABA ID + Phone Number ID ───────────────────────────────── */
  let phone_number_id = rawPhoneId as string | undefined;
  let waba_id = rawWabaId as string | undefined;

  let discoveryDebug: { strategyA?: any } = {};

  if (!phone_number_id || !waba_id) {
    console.log("[EmbeddedSignup][BACKEND DIAGNOSTIC] WABA/Phone not fully provided in payload, running discovery...");
    // ── Strategy A: /me/whatsapp_business_accounts ──
    try {
      const meRes = await fetch(
        `https://graph.facebook.com/${GRAPH_VERSION}/me/whatsapp_business_accounts` +
        `?fields=id,name,phone_numbers{id,display_phone_number}`,
        { headers: { Authorization: `Bearer ${businessToken}` } },
      );
      const meData = await meRes.json();

      console.log("[EmbeddedSignup][BACKEND DIAGNOSTIC] Strategy A discovery response:", {
        status: meRes.status,
        ok: meRes.ok,
        wabaCount: meData?.data?.length ?? 0,
        foundWabaId: meData?.data?.[0]?.id,
        foundPhoneId: meData?.data?.[0]?.phone_numbers?.data?.[0]?.id,
        error: meData?.error,
      });

      if (meRes.ok && meData.data?.[0]) {
        waba_id = waba_id ?? meData.data[0].id;
        phone_number_id = phone_number_id ?? meData.data[0].phone_numbers?.data?.[0]?.id;
      } else if (!meRes.ok) {
        discoveryDebug.strategyA = meData?.error ?? meData;
      }
    } catch (err: any) {
      console.warn("[EmbeddedSignup][BACKEND DIAGNOSTIC] Strategy A failed:", err?.message || err);
    }
  }

  // ── Strategy B (/me/businesses fallback) removed ──
  // كانت معتمدة على صلاحية business_management اللي اتشالت. لو الاكتشاف
  // التلقائي فشل، اليوزر بيستخدم فورم الربط اليدوي الموجود في WhatsAppContent.

  console.log("[EmbeddedSignup][BACKEND DIAGNOSTIC] Discovery resolution result:", {
    resolvedPhoneId: phone_number_id,
    resolvedWabaId: waba_id,
  });

  if (!phone_number_id || !waba_id) {
    console.error(
      "[EmbeddedSignup] Could not resolve WABA/Phone — rawPhoneId:", rawPhoneId,
      "rawWabaId:", rawWabaId,
      "graphErrors:", JSON.stringify(discoveryDebug),
    );

    const permissionIssue =
      discoveryDebug.strategyA?.code === 10 ||
      discoveryDebug.strategyA?.type === "OAuthException";

    return NextResponse.json(
      {
        code: "WABA_DISCOVERY_FAILED",
        error: permissionIssue
          ? "الاكتشاف التلقائي لرقمك ماقدرش يحصل على WABA ID أو Phone Number ID — ده بيحصل أحيانًا لو حساب الواتساب بتاعك تابع لـ Business Manager مختلف. انزل تحت واستخدم خيار 'أدخل البيانات يدوياً' — تقدر تلاقي الـ Phone Number ID والـ WABA ID من Meta Business Suite ← WhatsApp Accounts."
          : "لم نتمكن من الحصول على WABA ID أو Phone Number ID — انزل تحت واستخدم خيار 'أدخل البيانات يدوياً' بإدخال الـ Phone Number ID والـ WABA ID من Meta Business Suite ← WhatsApp Accounts.",
      },
      { status: 502 },
    );
  }

  /* ── 5. Subscribe webhooks on the customer's WABA ───────────────────────── */
  let webhookSubscribed = false;
  try {
    const subRes = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/${waba_id}/subscribed_apps`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ access_token: businessToken }),
      },
    );
    const subData = await subRes.json();
    webhookSubscribed = subData.success === true;
    console.log("[EmbeddedSignup][BACKEND DIAGNOSTIC] Webhook subscription result:", {
      success: webhookSubscribed,
      error: subData?.error,
    });
  } catch (err: any) {
    console.warn("[EmbeddedSignup][BACKEND DIAGNOSTIC] Webhook subscription network error:", err?.message || err);
  }

  /* ── 6. Save encrypted token + IDs to DB (Neon) ─────────────────────────── */
  const encryptedToken = encryptToken(businessToken);

  // نسب القوالب القديمة للحساب المغادِر عند التبديل (تمنع تسربها للجديد)
  const { attributeLegacyTemplatesToDepartingAccount } = await import("@/lib/templates-actions");
  await attributeLegacyTemplatesToDepartingAccount(ownerId, waba_id);

  try {
    console.log("[EmbeddedSignup][BACKEND DIAGNOSTIC] Performing Neon DB upsert for user:", ownerId);
    await prisma.whatsAppAccount.upsert({
      where: { userId: ownerId },
      update: {
        accessToken: encryptedToken,
        phoneNumberId: phone_number_id,
        wabaId: waba_id,
        tokenStatus: "UNKNOWN",
        tokenExpiresAt: null,
        lastTokenCheckAt: null,
        tokenDataAccessExpiresAt: null,
        tokenWarning7SentAt: null,
        tokenWarning3SentAt: null,
        tokenWarning1SentAt: null,
        tokenExpiredNotifiedAt: null,
        tokenInvalidNotifiedAt: null,
      },
      create: {
        userId: ownerId,
        accessToken: encryptedToken,
        phoneNumberId: phone_number_id,
        wabaId: waba_id,
      },
    });
    console.log("[EmbeddedSignup][BACKEND DIAGNOSTIC] Neon DB upsert succeeded for user:", ownerId);
  } catch (err: any) {
    console.error("[EmbeddedSignup][BACKEND DIAGNOSTIC] DB upsert error:", err?.message || err);
    return NextResponse.json(
      { error: "فشل حفظ البيانات — حاول مرة أخرى" },
      { status: 500 },
    );
  }

  /* ── 7. Return success (no token in response!) ──────────────────────────── */
  return NextResponse.json({
    success: true,
    phone_number_id,
    waba_id,
    webhookSubscribed,
  });
}