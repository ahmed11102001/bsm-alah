import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { checkFeature, guardResponse } from "@/lib/plan-guard";

async function resolveUserId(session: any): Promise<string | null> {
  const directId = session?.user?.id;
  if (typeof directId === "string" && directId.trim()) return directId;
  const email = session?.user?.email;
  if (typeof email !== "string" || !email.trim()) return null;
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() }, select: { id: true } });
  return user?.id ?? null;
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = await resolveUserId(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const blocked = guardResponse(await checkFeature(userId, "aiAgent"));
  if (blocked) return blocked;
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const relatedProductIds = body?.relatedProductIds;
  if (!Array.isArray(relatedProductIds) || relatedProductIds.some((value: unknown) => typeof value !== "string") || relatedProductIds.length > 50) return NextResponse.json({ error: "relatedProductIds must be an array of product IDs" }, { status: 400 });
  const uniqueIds = Array.from(new Set(relatedProductIds as string[]));
  const product = await prisma.product.findFirst({ where: { id, userId }, select: { id: true } });
  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });
  const validCount = await prisma.product.count({ where: { id: { in: uniqueIds }, userId } });
  if (validCount !== uniqueIds.length) return NextResponse.json({ error: "Some related products are invalid" }, { status: 400 });
  const updated = await prisma.product.update({ where: { id }, data: { relatedProductIds: uniqueIds }, select: { id: true, relatedProductIds: true } });
  return NextResponse.json(updated);
}
