// src/app/api/shopify/callback/route.ts
// ─── OAuth callback محذوف — الربط بقى عن طريق Access Token مباشرة ────────────
import { NextResponse } from "next/server";

export async function GET() {
  // OAuth flow متوقف — اليوزر يربط من صفحة API مباشرة
  return NextResponse.redirect(
    new URL(
      "/dashboard?tab=api&msg=use_direct_token",
      process.env.NEXT_PUBLIC_APP_URL ?? "https://whatsprosystem.vercel.app"
    )
  );
}