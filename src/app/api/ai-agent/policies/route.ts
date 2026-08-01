// src/app/api/ai-agent/policies/route.ts
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

const VALID_TYPES = ["return_policy", "shipping_policy", "payment_policy", "warranty_policy", "privacy_policy", "custom"];

// ── GET — جيب كل السياسات ──
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = await resolveUserId(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const policies = await prisma.brandPolicy.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(policies);
}

// ── POST — أضف سياسة جديدة ──
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = await resolveUserId(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const guard = await checkFeature(userId, "aiAgent");
  const blocked = guardResponse(guard);
  if (blocked) return blocked;

  const body = await req.json();
  const { type, title, content } = body;

  if (!type || !VALID_TYPES.includes(type)) {
    return NextResponse.json({ error: `type must be one of: ${VALID_TYPES.join(", ")}` }, { status: 400 });
  }
  if (!title?.trim() || !content?.trim()) {
    return NextResponse.json({ error: "title and content are required" }, { status: 400 });
  }

  const policy = await prisma.brandPolicy.create({
    data: {
      userId,
      type: type as any,
      title: title.trim(),
      content: content.trim(),
    },
  });

  return NextResponse.json(policy, { status: 201 });
}

// ── PUT — عدّل سياسة ──
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = await resolveUserId(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const guard = await checkFeature(userId, "aiAgent");
  const blocked = guardResponse(guard);
  if (blocked) return blocked;

  const body = await req.json();
  const { id, type, title, content } = body;

  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const existing = await prisma.brandPolicy.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: "Policy not found" }, { status: 404 });

  const policy = await prisma.brandPolicy.update({
    where: { id },
    data: {
      ...(type && VALID_TYPES.includes(type) ? { type: type as any } : {}),
      ...(title?.trim() ? { title: title.trim() } : {}),
      ...(content?.trim() ? { content: content.trim() } : {}),
    },
  });

  return NextResponse.json(policy);
}

// ── DELETE — احذف سياسة ──
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = await resolveUserId(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  await prisma.brandPolicy.deleteMany({ where: { id, userId } });
  return NextResponse.json({ success: true });
}
