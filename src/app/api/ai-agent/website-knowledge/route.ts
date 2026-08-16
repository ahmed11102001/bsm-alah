import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { checkFeature, guardResponse } from "@/lib/plan-guard";
import { assertSafeUrl } from "@/lib/website-crawl";
import { requirePermission } from "@/lib/permissions";

async function resolveUserId(session: any): Promise<string | null> {
  const directId = session?.user?.id;
  if (typeof directId === "string" && directId.trim()) return directId;
  const email = session?.user?.email;
  if (typeof email !== "string" || !email.trim()) return null;
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() }, select: { id: true } });
  return user?.id ?? null;
}

export async function GET() {
  const session = await getServerSession(authOptions);

  const denied = requirePermission(session, "AI_AGENT_MANAGE");

  if (denied) return denied;
  const userId = await resolveUserId(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const [pages, settings] = await Promise.all([
    prisma.websitePage.findMany({ where: { userId, isActive: true }, orderBy: { lastCrawledAt: "desc" }, select: { id: true, url: true, title: true, lastCrawledAt: true, _count: { select: { chunks: true } } } }),
    prisma.websiteCrawlSettings.findUnique({ where: { userId } }),
  ]);
  return NextResponse.json({ pages, settings: settings ?? { isEnabled: false, rootUrl: null } });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);

  const denied = requirePermission(session, "AI_AGENT_MANAGE");

  if (denied) return denied;
  const userId = await resolveUserId(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const pageId = new URL(req.url).searchParams.get("pageId");
  if (!pageId) return NextResponse.json({ error: "pageId is required" }, { status: 400 });
  await prisma.websitePage.deleteMany({ where: { id: pageId, userId } });
  return NextResponse.json({ success: true });
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);

  const denied = requirePermission(session, "AI_AGENT_MANAGE");

  if (denied) return denied;
  const userId = await resolveUserId(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const blocked = guardResponse(await checkFeature(userId, "aiAgent"));
  if (blocked) return blocked;
  const body = await req.json().catch(() => ({}));
  const isEnabled = Boolean(body.isEnabled);
  let rootUrl: string | null | undefined;
  if (body.rootUrl) {
    try { rootUrl = (await assertSafeUrl(String(body.rootUrl).trim())).toString().replace(/\/$/, ""); }
    catch (error: any) { return NextResponse.json({ error: error?.message || "Invalid or unsafe URL" }, { status: 400 }); }
  }
  const result = await prisma.websiteCrawlSettings.upsert({ where: { userId }, update: { isEnabled, ...(rootUrl !== undefined ? { rootUrl } : {}) }, create: { userId, isEnabled, rootUrl: rootUrl ?? null } });
  return NextResponse.json(result);
}
