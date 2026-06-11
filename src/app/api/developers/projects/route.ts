import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getDevSession } from "@/lib/dev-auth";

// ── GET /api/developers/projects — جلب كل مشاريع المبرمج ─────────────────────
export async function GET(req: NextRequest) {
  const session = await getDevSession(req);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const projects = await prisma.developerProject.findMany({
    where: { developerId: session.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      description: true,
      status: true,
      createdAt: true,
      transferredAt: true,
      transferredToUserId: true,
    },
  });

  return NextResponse.json({ projects });
}

// ── POST /api/developers/projects — إنشاء مشروع جديد ────────────────────────
export async function POST(req: NextRequest) {
  const session = await getDevSession(req);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { name, description } = await req.json();

  if (!name?.trim()) {
    return NextResponse.json({ error: "اسم المشروع مطلوب" }, { status: 400 });
  }
  if (name.trim().length < 3) {
    return NextResponse.json({ error: "اسم المشروع 3 أحرف على الأقل" }, { status: 400 });
  }

  // حد أقصى 10 مشاريع نشطة للمبرمج الواحد
  const count = await prisma.developerProject.count({
    where: { developerId: session.id, status: "ACTIVE" },
  });
  if (count >= 10) {
    return NextResponse.json({ error: "وصلت للحد الأقصى (10 مشاريع نشطة)" }, { status: 400 });
  }

  const project = await prisma.developerProject.create({
    data: {
      developerId: session.id,
      name: name.trim(),
      description: description?.trim() || null,
    },
  });

  return NextResponse.json({ ok: true, project }, { status: 201 });
}