// src/app/api/mcp/token/route.ts
// ── OAuth 2.0 Token Endpoint ──────────────────────────────────────────────────
//
// claude.ai بيبعت POST هنا بعد ما يستلم الـ code من /authorize
// احنا بنفك تشفير الـ code ونرجع الـ API Key كـ access_token
// بعدين claude.ai هيبعت Authorization: Bearer <apiKey> مع كل طلب لـ /api/mcp
/// <reference types="node" />

import { NextRequest, NextResponse } from "next/server";
import prisma                         from "@/lib/prisma";

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function POST(req: NextRequest) {
  try {
    // claude.ai ممكن يبعت application/x-www-form-urlencoded أو application/json
    let code: string | null = null;

    const contentType = req.headers.get("content-type") ?? "";

    if (contentType.includes("application/json")) {
      const body = await req.json();
      code = body.code ?? null;
    } else {
      // form-urlencoded (الأكثر شيوعاً في OAuth)
      const text   = await req.text();
      const params = new URLSearchParams(text);
      code = params.get("code");
    }

    if (!code) {
      return NextResponse.json(
        { error: "invalid_request", error_description: "code is required" },
        { status: 400, headers: CORS }
      );
    }

    // ── فك تشفير الـ code لاستخراج الـ API Key ──────────────────────────────
    let apiKey: string;
    try {
      const decoded = Buffer.from(code, "base64url").toString("utf-8");
      // الصيغة: "apiKey:timestamp"
      apiKey = decoded.split(":")[0];
    } catch {
      return NextResponse.json(
        { error: "invalid_grant", error_description: "Invalid code" },
        { status: 400, headers: CORS }
      );
    }

    // ── تحقق إن الـ API Key لسه صالح ────────────────────────────────────────
    const user = await prisma.user.findFirst({
      where:  { apiKey, deletedAt: null },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "invalid_grant", error_description: "API Key is no longer valid" },
        { status: 400, headers: CORS }
      );
    }

    // ── رجّع الـ access_token ─────────────────────────────────────────────────
    // الـ access_token = API Key نفسه
    // بعدين /api/mcp هيقبله في Authorization: Bearer <apiKey>
    return NextResponse.json(
      {
        access_token: apiKey,
        token_type:   "bearer",
        expires_in:   2_592_000, // 30 يوم
      },
      { headers: CORS }
    );

  } catch (err: any) {
    console.error("[MCP/token] Error:", err);
    return NextResponse.json(
      { error: "server_error", error_description: err.message ?? "Internal error" },
      { status: 500, headers: CORS }
    );
  }
}