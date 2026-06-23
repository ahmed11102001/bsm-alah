// src/app/api/meta/embedded-signup-complete/route.ts
// ─── WhatsApp Embedded Signup — Code Exchange + WABA Discovery ────────────────
//
// Receives the short-lived `code` from FB.login (and optionally phone_number_id
// + waba_id from the message event), exchanges it for a long-lived business
// token, subscribes webhooks on the customer's WABA, and saves everything
// (encrypted) in the DB.
//
// The business token is NEVER sent back to the frontend.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession }          from "next-auth";
import { authOptions }               from "@/lib/auth";
import prisma                        from "@/lib/prisma";
import { encryptToken }              from "@/lib/crypto";

const GRAPH_VERSION = process.env.NEXT_PUBLIC_GRAPH_API_VERSION ?? "v22.0";

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
    phone_number_id: rawPhoneId,
    waba_id: rawWabaId,
  } = body as {
    code?: string;
    phone_number_id?: string;
    waba_id?: string;
  };

  if (!code) {
    return NextResponse.json({ error: "code مطلوب" }, { status: 400 });
  }

  /* ── 3. Exchange code → business token ──────────────────────────────────── */
  const appId     = process.env.NEXT_PUBLIC_META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;

  if (!appId || !appSecret) {
    console.error("[EmbeddedSignup] Missing NEXT_PUBLIC_META_APP_ID or META_APP_SECRET");
    return NextResponse.json(
      { error: "Server configuration error — Meta credentials missing" },
      { status: 500 },
    );
  }

  let tokenData: any;
  try {
    const tokenRes = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/oauth/access_token`,
      {
        method:  "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id:     appId,
          client_secret: appSecret,
          code,
        }),
      },
    );

    tokenData = await tokenRes.json();

    if (!tokenRes.ok || tokenData.error || !tokenData.access_token) {
      console.error("[EmbeddedSignup] Token exchange error:", tokenData);
      return NextResponse.json(
        {
          error: tokenData.error?.message
            ?? "فشل تبادل الـ code — تأكد من صلاحيته",
        },
        { status: 502 },
      );
    }
  } catch (err) {
    console.error("[EmbeddedSignup] Token exchange network error:", err);
    return NextResponse.json(
      { error: "فشل الاتصال بـ Meta — حاول مرة أخرى" },
      { status: 502 },
    );
  }

  const businessToken: string = tokenData.access_token;

  /* ── 4. Resolve WABA ID + Phone Number ID ───────────────────────────────── */
  let phone_number_id = rawPhoneId as string | undefined;
  let waba_id         = rawWabaId as string | undefined;

  if (!phone_number_id || !waba_id) {
    try {
      // GET /me/whatsapp_business_accounts → list of WABAs tied to this token
      const meRes = await fetch(
        `https://graph.facebook.com/${GRAPH_VERSION}/me/whatsapp_business_accounts` +
          `?fields=id,name,phone_numbers{id,display_phone_number}`,
        { headers: { Authorization: `Bearer ${businessToken}` } },
      );
      const meData = await meRes.json();

      if (meRes.ok && meData.data?.[0]) {
        waba_id         = waba_id         ?? meData.data[0].id;
        phone_number_id = phone_number_id ?? meData.data[0].phone_numbers?.data?.[0]?.id;
      }
    } catch (err) {
      console.warn("[EmbeddedSignup] WABA discovery failed:", err);
    }
  }

  if (!phone_number_id || !waba_id) {
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
      console.warn("[EmbeddedSignup] Webhook subscription warning:", subData);
    }
  } catch (err) {
    console.warn("[EmbeddedSignup] Webhook subscription network error:", err);
  }

  /* ── 6. Save encrypted token + IDs to DB ────────────────────────────────── */
  const encryptedToken = encryptToken(businessToken);

  try {
    await prisma.whatsAppAccount.upsert({
      where:  { userId: ownerId },
      update: {
        accessToken:   encryptedToken,
        phoneNumberId: phone_number_id,
        wabaId:        waba_id,
      },
      create: {
        userId:        ownerId,
        accessToken:   encryptedToken,
        phoneNumberId: phone_number_id,
        wabaId:        waba_id,
      },
    });
  } catch (err) {
    console.error("[EmbeddedSignup] DB upsert error:", err);
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
