import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { checkFeature, guardResponse } from "@/lib/plan-guard";
import { assertSafeUrl } from "@/lib/website-crawl";
import { inngest } from "@/inngest/client";

async function resolveUserId(session: any): Promise<string | null> {
  const directId = session?.user?.id;
  if (typeof directId === "string" && directId.trim()) return directId;
  const email = session?.user?.email;
  if (typeof email !== "string" || !email.trim()) return null;
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() }, select: { id: true } });
  return user?.id ?? null;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = await resolveUserId(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const blocked = guardResponse(await checkFeature(userId, "aiAgent"));
  if (blocked) return blocked;
  const body = await req.json().catch(() => ({}));
  if (typeof body.rootUrl !== "string" || !body.rootUrl.trim()) return NextResponse.json({ error: "rootUrl is required" }, { status: 400 });
  let rootUrl: string;
  try { rootUrl = (await assertSafeUrl(body.rootUrl.trim())).toString().replace(/\/$/, ""); }
  catch (error: any) { return NextResponse.json({ error: error?.message || "Invalid or unsafe URL" }, { status: 400 }); }
  const latest = await prisma.websitePage.findFirst({ where: { userId }, orderBy: { lastCrawledAt: "desc" }, select: { lastCrawledAt: true } });
  if (latest && Date.now() - latest.lastCrawledAt.getTime() < 60 * 60 * 1000) return NextResponse.json({ error: "Website knowledge can be refreshed once per hour" }, { status: 429 });
  await prisma.websiteCrawlSettings.upsert({ where: { userId }, update: { rootUrl, isEnabled: true }, create: { userId, rootUrl, isEnabled: true } });
  await inngest.send({ name: "website/crawl.requested", data: { userId, rootUrl } });
  return NextResponse.json({ success: true, message: "Website knowledge extraction started" });
}
