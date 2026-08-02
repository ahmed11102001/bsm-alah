import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { checkFeature, guardResponse } from "@/lib/plan-guard";
import { encryptToken } from "@/lib/crypto";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const rawUrl = typeof body.storeUrl === "string" ? body.storeUrl.trim() : "";
    const consumerKey = typeof body.consumerKey === "string" ? body.consumerKey.trim() : "";
    const consumerSecret = typeof body.consumerSecret === "string" ? body.consumerSecret.trim() : "";
    if (!rawUrl || !consumerKey || !consumerSecret) return NextResponse.json({ error: "storeUrl, consumerKey and consumerSecret are required" }, { status: 400 });
    const storeUrl = (/^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`).replace(/\/+$/, "");
    if (!/^https:\/\//i.test(storeUrl)) return NextResponse.json({ error: "WooCommerce REST API requires HTTPS" }, { status: 400 });
    const dbUser = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true, parentId: true } });
    if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });
    const userId = dbUser.parentId ?? dbUser.id;
    const blocked = guardResponse(await checkFeature(userId, "storeIntegration"));
    if (blocked) return blocked;
    const authHeader = `Basic ${Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64")}`;
    const test = await fetch(`${storeUrl}/wp-json/wc/v3/products?per_page=1`, { headers: { Authorization: authHeader, Accept: "application/json" }, signal: AbortSignal.timeout(15_000) });
    if (test.status === 401 || test.status === 403) return NextResponse.json({ error: "Consumer Key/Secret are invalid or missing permissions" }, { status: 422 });
    if (!test.ok) return NextResponse.json({ error: `Could not connect to WooCommerce (HTTP ${test.status})` }, { status: 422 });
    await prisma.wooCommerceStore.upsert({ where: { userId }, update: { storeUrl, consumerKey: encryptToken(consumerKey), consumerSecret: encryptToken(consumerSecret), isConnected: true, isActive: true }, create: { userId, storeName: new URL(storeUrl).hostname, storeUrl, consumerKey: encryptToken(consumerKey), consumerSecret: encryptToken(consumerSecret), isConnected: true, isActive: true } });
    try { void (await import("@/inngest/client")).inngest.send({ name: "product/sync.requested", data: { userId, source: "woocommerce" } }); } catch (error) { console.error("[WooCommerce Connect REST] Failed to trigger sync", error); }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[WooCommerce Connect REST] Error:", error);
    return NextResponse.json({ error: error?.message || "Could not connect to WooCommerce" }, { status: 422 });
  }
}
