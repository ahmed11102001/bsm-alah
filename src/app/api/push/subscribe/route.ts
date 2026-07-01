// src/app/api/push/subscribe/route.ts
// ─── POST /api/push/subscribe — تسجيل جهاز لاستقبال Push ────────────────────

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";

const MAX_DEVICES_PER_USER = 10;

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { endpoint, keys } = body;
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  // Upsert — لو الـ endpoint موجود حدّثه، لو جديد أنشئه
  await prisma.pushSubscription.upsert({
    where: { endpoint },
    update: {
      p256dh:    keys.p256dh,
      auth:      keys.auth,
      userAgent: req.headers.get("user-agent") ?? undefined,
    },
    create: {
      userId:    user.id,
      endpoint,
      p256dh:    keys.p256dh,
      auth:      keys.auth,
      userAgent: req.headers.get("user-agent") ?? undefined,
    },
  });

  // ── حد أقصى 10 أجهزة — امسح الأقدم ─────────────────────────────────────
  const allSubs = await prisma.pushSubscription.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  if (allSubs.length > MAX_DEVICES_PER_USER) {
    const idsToDelete = allSubs.slice(MAX_DEVICES_PER_USER).map((s) => s.id);
    await prisma.pushSubscription.deleteMany({
      where: { id: { in: idsToDelete } },
    });
  }

  return NextResponse.json({ ok: true });
}
