import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getDevSessionFromRequest } from "@/lib/dev-auth";

// ── POST /api/developers/projects/[id]/transfer ───────────────────────────────
// تسليم المشروع لعميل (user في نظام وني الرئيسي)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getDevSessionFromRequest(req);
    if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

    // Verify project ownership
    const project = await prisma.developerProject.findFirst({
      where: { id, developerId: session.id, status: "ACTIVE" },
      include: {
        metaConnection: true,
        apiKeys: { where: { status: "ACTIVE" } },
      },
    });

    if (!project) return NextResponse.json({ error: "المشروع مش موجود أو اتسلم بالفعل" }, { status: 404 });

    const { targetEmail, note } = await req.json();

    if (!targetEmail?.trim()) {
      return NextResponse.json({ error: "إيميل العميل مطلوب" }, { status: 400 });
    }

    // Look up target user in the main Wani user table
    const targetUser = await prisma.user.findUnique({
      where: { email: targetEmail.trim().toLowerCase() },
      select: { id: true, name: true, email: true },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: "العميل ده مش مسجل في منصة وني — اطلب منه يعمل حساب الأول" },
        { status: 404 }
      );
    }

    // Perform transfer: mark project as TRANSFERRED and record target user
    await prisma.developerProject.update({
      where: { id },
      data: {
        status: "TRANSFERRED",
        transferredToUserId: targetUser.id,
        transferredAt: new Date(),
      },
    });

    return NextResponse.json({
      ok: true,
      transferredTo: {
        id: targetUser.id,
        name: targetUser.name,
        email: targetUser.email,
      },
    });
  } catch (err) {
    console.error("[project-transfer]", err);
    return NextResponse.json({ error: "حصل خطأ" }, { status: 500 });
  }
}