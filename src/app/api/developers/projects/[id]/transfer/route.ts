import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getDevSessionFromRequest } from "@/lib/dev-auth";
import { devError } from "@/lib/dev-errors";
import { getProjectForOwner } from "@/lib/dev-project-auth";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";

// Generate a secure 8-character code, excluding ambiguous characters (0, O, 1, I)
function generateSecureCode() {
  const charset = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  const bytes = randomBytes(8);
  for (let i = 0; i < bytes.length; i++) {
    code += charset[bytes[i] % charset.length];
  }
  return code;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getDevSessionFromRequest(req);
    if (!session) return devError("unauthenticated", "AUTH_REQUIRED", 401);

    const { email, role } = await req.json();
    if (!email || !["OWNER", "DEVELOPER"].includes(role)) {
      return devError("بيانات غير صالحة", "INVALID_REQUEST", 400);
    }

    let project;
    if (role === "OWNER") {
      // الطالب لازم يكون developerId
      project = await prisma.developerProject.findFirst({
        where: { id, developerId: session.id, status: "ACTIVE" },
      });
      if (!project) return devError("غير مصرح", "FORBIDDEN", 403);

      if (project.ownerId) {
        return devError(
          "المشروع عنده مالك بالفعل — لازم يشيل نفسه أو تتواصل مع الدعم قبل تعيين مالك جديد",
          "CONFLICT",
          409
        );
      }
    } else {
      // الطالب لازم يكون ownerId
      project = await getProjectForOwner(id, session.id);
      if (!project) return devError("غير مصرح", "FORBIDDEN", 403);

      if (project.developerRemovedAt === null) {
        return devError(
          "المشروع عنده مطور نشط بالفعل — لازم تشيله الأول قبل ما تدعو مطور جديد",
          "CONFLICT",
          409
        );
      }
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Revoke previous pending invites for the same role
    await prisma.developerProjectInvite.updateMany({
      where: { projectId: id, role, status: "PENDING" },
      data: { status: "REVOKED" },
    });

    const code = generateSecureCode();
    const codeHash = await bcrypt.hash(code, 10);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await prisma.developerProjectInvite.create({
      data: {
        projectId: id,
        email: normalizedEmail,
        codeHash,
        role,
        createdById: session.id,
        expiresAt,
        status: "PENDING",
      },
    });

    return NextResponse.json({ ok: true, code });
  } catch (err) {
    console.error("[project-transfer-post]", err);
    return devError("حصل خطأ", "INTERNAL", 500);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getDevSessionFromRequest(req);
    if (!session) return devError("unauthenticated", "AUTH_REQUIRED", 401);

    // Only owner can remove developer
    const project = await getProjectForOwner(id, session.id);
    if (!project) return devError("غير مصرح — للمالك فقط", "FORBIDDEN", 403);

    await prisma.developerProject.update({
      where: { id },
      data: { developerRemovedAt: new Date() },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[project-transfer-delete]", err);
    return devError("حصل خطأ", "INTERNAL", 500);
  }
}