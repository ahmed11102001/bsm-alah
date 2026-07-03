import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getDevSessionFromRequest } from "@/lib/dev-auth";
import { isOwnerOnlyAccount } from "@/lib/dev-role";

// ── GET /api/developers/projects — جلب كل مشاريع المبرمج ─────────────────────
export async function GET(req: NextRequest) {
  const session = await getDevSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const projects = await prisma.developerProject.findMany({
    where: { 
      OR: [
        { developerId: session.id },
        { ownerId: session.id }
      ]
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      description: true,
      status: true,
      createdAt: true,
      transferredAt: true,
      transferredToUserId: true,
      developerId: true,
      ownerId: true,
      developerRemovedAt: true,
    },
  });

  const enrichedProjects = projects.map(p => {
    const viewerRole = p.ownerId === session.id ? "owner" : "developer";
    const canEnter = !(viewerRole === "developer" && p.developerRemovedAt !== null);
    return { ...p, viewerRole, canEnter };
  });

  return NextResponse.json({ projects: enrichedProjects });
}

// ── POST /api/developers/projects — إنشاء مشروع جديد ────────────────────────
export async function POST(req: NextRequest) {
  const session = await getDevSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  // الأونر (عميل استلم مشروع جاهز) مش يقدر ينشئ مشاريع جديدة — الإنشاء للمطور بس
  if (await isOwnerOnlyAccount(session.id)) {
    return NextResponse.json(
      { error: "حساب الأونر مش يقدر ينشئ مشاريع جديدة" },
      { status: 403 }
    );
  }

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