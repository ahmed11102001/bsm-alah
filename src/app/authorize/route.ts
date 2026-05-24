// src/app/authorize/route.ts
// ── OAuth 2.0 Authorization Endpoint ─────────────────────────────────────────
//
// الـ flow:
// 1. claude.ai يعيد توجيه المتصفح لـ /authorize?client_id=Bearer+bsm_...&redirect_uri=...&state=...
// 2. احنا نتحقق من الـ API Key في client_id
// 3. نعمل code مشفر ونرجع redirect لـ claude.ai
//
// ملاحظة: client_id = "Bearer bsm_..." (كل الـ string هو الـ client_id من claude.ai)
/// <reference types="node" />

import { NextRequest } from "next/server";
import prisma           from "@/lib/prisma";
import { createHash }   from "crypto";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  const clientId    = searchParams.get("client_id")    ?? "";
  const redirectUri = searchParams.get("redirect_uri") ?? "";
  const state       = searchParams.get("state")        ?? "";

  // ── استخرج الـ API Key من client_id (قد يكون "Bearer bsm_..." أو "bsm_..." مباشرة) ──
  const apiKey = clientId.replace(/^Bearer\s+/i, "").trim();

  // ── صفحة خطأ بسيطة لو مفيش redirect_uri ────────────────────────────────────
  if (!redirectUri) {
    return new Response(
      `<!DOCTYPE html><html><body style="font-family:sans-serif;padding:2rem;direction:rtl">
       <h2>⚠️ طلب غير صالح</h2>
       <p>مفيش redirect_uri في الطلب.</p>
      </body></html>`,
      { status: 400, headers: { "Content-Type": "text/html" } }
    );
  }

  // ── تحقق من الـ API Key في الـ DB ───────────────────────────────────────────
  const user = apiKey
    ? await prisma.user.findFirst({
        where:  { apiKey, deletedAt: null },
        select: { id: true, name: true },
      })
    : null;

  if (!user) {
    // أرجع صفحة خطأ واضحة بدل ما نرجع 401
    return new Response(
      `<!DOCTYPE html><html><body style="font-family:sans-serif;padding:2rem;direction:rtl;background:#0f0f0f;color:#fff">
       <h2 style="color:#ef4444">❌ مفتاح API غير صالح</h2>
       <p>الـ API Key المدخل غير صحيح أو منتهي الصلاحية.</p>
       <p style="color:#9ca3af;font-size:0.85rem">تأكد من نسخ الـ API Key من صفحة API في واتس برو.</p>
      </body></html>`,
      { status: 401, headers: { "Content-Type": "text/html" } }
    );
  }

  // ── أنشئ auth code ────────────────────────────────────────────────────────
  // نشفّر الـ API Key + timestamp عشان يكون single-use نوعاً ما
  // لو حد أخد الـ code ما ينفعش يعمل حاجة تانية بيه غير استبداله بـ token
  const timestamp = Date.now().toString(36);
  const raw       = `${apiKey}:${timestamp}`;
  const code      = Buffer.from(raw).toString("base64url");

  // ── Redirect لـ claude.ai مع الـ code ────────────────────────────────────
  const callbackUrl = new URL(redirectUri);
  callbackUrl.searchParams.set("code",  code);
  callbackUrl.searchParams.set("state", state);

  return Response.redirect(callbackUrl.toString(), 302);
}