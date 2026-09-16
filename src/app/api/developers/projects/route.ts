import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getDevSessionFromRequest } from "@/lib/dev-auth";
import { devError } from "@/lib/dev-errors";
import { isOwnerOnlyAccount } from "@/lib/dev-role";

// ── GET /api/developers/projects — جلب كل مشاريع المبرمج ─────────────────────
export async function GET(req: NextRequest) {
  const session = await getDevSessionFromRequest(req);
  if (!session) return devError("غير مصرح", "AUTH_REQUIRED", 401);

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
  if (!session) return devError("غير مصرح", "AUTH_REQUIRED", 401);

  // الأونر (عميل استلم مشروع جاهز) مش يقدر ينشئ مشاريع جديدة — الإنشاء للمطور بس
  if (await isOwnerOnlyAccount(session.id)) {
    return devError(
      "حساب الأونر مش يقدر ينشئ مشاريع جديدة",
      "FORBIDDEN",
      403
    );
  }

  const { name, description } = await req.json();

  if (!name?.trim()) {
    return devError("اسم المشروع مطلوب", "INVALID_REQUEST", 400);
  }
  if (name.trim().length < 3) {
    return devError("اسم المشروع 3 أحرف على الأقل", "INVALID_REQUEST", 400);
  }



  const trialStartedAt = new Date();
  const trialEndsAt = new Date(trialStartedAt.getTime() + 30 * 24 * 60 * 60 * 1000);

  const project = await prisma.developerProject.create({
    data: {
      developerId: session.id,
      name: name.trim(),
      description: description?.trim() || null,
      trialStartedAt,
      trialEndsAt,
      trialCreditsTotal: 30,
      trialCreditsUsed: 0,
      monthlyFreeTotal: 30,
      monthlyFreeUsed: 0,
      paidBalanceEGP: 0,
    },
  });

  return NextResponse.json({ ok: true, project }, { status: 201 });
}