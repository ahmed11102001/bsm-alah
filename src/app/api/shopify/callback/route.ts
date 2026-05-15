// src/app/api/shopify/callback/route.ts
// OAuth callback متوقف — الربط بقى Webhook فقط
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.redirect(
    new URL(
      "/dashboard?tab=api",
      process.env.NEXT_PUBLIC_APP_URL ?? "https://whatsprosystem.vercel.app"
    )
  );
}